import './loadEnv.js';
import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '@vahan360/contracts';
import { getPrisma, disconnectPrisma } from '@vahan360/db';
import { createBrowserPool } from '@vahan360/browser-pool';
import { resolveScraper } from '@vahan360/scraper-core';
import {
  loadKhananConfig,
  httpMetadataOverrides,
  rateLimiterFromConfig,
} from '@vahan360/khanan-config';
import {
  getQueueConnection,
  enqueueConsignerJobsForSnapshot,
  enqueueChallanJobsForConsigners,
  enqueueChallanPassJobs,
  enqueueVehicleStatusJobs,
  getVehicleRegNosForChallanRow,
} from '@vahan360/epass-orchestrator';
import { persistEpassReport } from './epassEtl.js';
import { persistConsignerReport } from './consignerEtl.js';
import { persistChallanReport } from './challanEtl.js';
import { persistChallanPassReport } from './challanPassEtl.js';
import { persistVehicleStatus } from './vehicleStatusEtl.js';
import {
  markJobActivity,
  markWorkerReady,
  startHealthServer,
  stopHealthServer,
} from './healthServer.js';

const HTTP_ONLY_TYPES = new Set([
  'bihar_epass',
  'bihar_epass_consigner',
  'bihar_epass_challan',
  'bihar_epass_challan_pass',
  'bihar_mcv_vehicle_status',
]);

const pool = createBrowserPool({
  stub: process.env.BROWSER_POOL_STUB !== 'false',
  maxBrowsers: 2,
});

/** @type {Worker | null} */
let worker = null;
let appliedConfigVersion = 0;

function buildRawCapturePayload(result, type, startedAt, storeRawCapture) {
  if (storeRawCapture || !result.success) {
    return result;
  }
  const rowCount = Array.isArray(result.data?.rows) ? result.data.rows.length : undefined;
  return {
    success: result.success,
    type,
    durationMs: Date.now() - startedAt,
    rowCount,
    error: result.error ?? null,
  };
}

async function runScrape(type, target, metadata) {
  const scraper = resolveScraper(type);
  const ctx = { type, target, metadata };

  if (HTTP_ONLY_TYPES.has(type)) {
    return scraper.scrape(ctx);
  }

  return pool.withPage(async () => scraper.scrape(ctx));
}

async function ensureScrapeJobRecord(prisma, job) {
  let { jobId, type, target, metadata } = job.data;

  if (jobId) {
    return { jobId, type, target, metadata: metadata ?? {} };
  }

  const scrapeJob = await prisma.scrapeJob.create({
    data: { type, target, status: 'pending' },
  });
  jobId = scrapeJob.id;

  await prisma.scrapeJob.update({
    where: { id: jobId },
    data: { bullJobId: String(job.id) },
  });

  return { jobId, type, target, metadata: metadata ?? {} };
}

async function processJob(job) {
  const prisma = getPrisma();
  const khananConfig = await loadKhananConfig(prisma);
  let { jobId, type, target, metadata } = await ensureScrapeJobRecord(prisma, job);

  metadata = {
    ...metadata,
    __http: httpMetadataOverrides(khananConfig),
  };

  const startedAt = Date.now();
  const storeRawCapture = Boolean(khananConfig.storeRawCapture);
  const autoFanout = Boolean(khananConfig.autoFanout);

  await prisma.scrapeJob.update({
    where: { id: jobId },
    data: { status: 'active' },
  });

  try {
    const result = await runScrape(type, target, metadata);

    await prisma.rawCapture.create({
      data: {
        jobId,
        payload: buildRawCapturePayload(result, type, startedAt, storeRawCapture),
      },
    });

    let etlSummary = null;
    if (result.success && result.data) {
      if (type === 'bihar_epass') {
        etlSummary = await persistEpassReport(prisma, result.data, jobId);
        if (autoFanout && etlSummary?.snapshotId) {
          const fanout = await enqueueConsignerJobsForSnapshot(
            prisma,
            etlSummary.snapshotId,
            jobId,
          );
          etlSummary = { ...etlSummary, fanout };
        }
      } else if (type === 'bihar_epass_consigner') {
        etlSummary = await persistConsignerReport(prisma, result.data);
        if (autoFanout && etlSummary?.consignerRows?.length) {
          const challanFanout = await enqueueChallanJobsForConsigners(
            prisma,
            etlSummary.consignerRows,
          );
          etlSummary = { ...etlSummary, challanFanout };
        }
      } else if (type === 'bihar_epass_challan') {
        etlSummary = await persistChallanReport(prisma, result.data);
        if (autoFanout && etlSummary?.challanRows?.length) {
          const passFanout = await enqueueChallanPassJobs(prisma, etlSummary.challanRows);
          etlSummary = { ...etlSummary, passFanout };
        }
      } else if (type === 'bihar_epass_challan_pass') {
        etlSummary = await persistChallanPassReport(prisma, result.data);
        if (autoFanout && metadata?.challanRowId) {
          const vrns = await getVehicleRegNosForChallanRow(prisma, String(metadata.challanRowId));
          if (vrns.length > 0) {
            const vehicleStatusFanout = await enqueueVehicleStatusJobs(prisma, vrns, jobId);
            etlSummary = { ...etlSummary, vehicleStatusFanout };
          }
        }
      } else if (type === 'bihar_mcv_vehicle_status') {
        etlSummary = await persistVehicleStatus(prisma, result.data, jobId);
      }
    }

    const enrichedResult = {
      ...result,
      data: result.data
        ? {
            ...result.data,
            ...(etlSummary ? { etl: etlSummary } : {}),
            durationMs: Date.now() - startedAt,
          }
        : undefined,
    };

    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: result.success ? 'completed' : 'failed',
        result: enrichedResult,
        error: result.error ?? null,
      },
    });

    return enrichedResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: message },
    });
    throw err;
  }
}

async function startOrReloadWorker() {
  const prisma = getPrisma();
  const cfg = await loadKhananConfig(prisma);

  if (worker && cfg.configVersion === appliedConfigVersion) {
    return cfg;
  }

  if (worker) {
    await worker.close();
    worker = null;
  }

  const limiter = rateLimiterFromConfig(cfg);
  worker = new Worker(QUEUE_NAMES.SCRAPE, processJob, {
    connection: getQueueConnection(),
    concurrency: cfg.workerConcurrency,
    limiter,
  });

  worker.on('completed', (job) => {
    markJobActivity();
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    markJobActivity();
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  appliedConfigVersion = cfg.configVersion;
  console.log(
    `Worker on "${QUEUE_NAMES.SCRAPE}" (concurrency=${cfg.workerConcurrency}, limiter=${JSON.stringify(limiter)}, configVersion=${cfg.configVersion})`,
  );
  return cfg;
}

startHealthServer();
await startOrReloadWorker();
markWorkerReady();
setInterval(() => {
  startOrReloadWorker().catch((err) => {
    console.error('Worker config reload failed:', err);
  });
}, 30_000);

async function shutdown() {
  if (worker) await worker.close();
  await pool.close();
  await disconnectPrisma();
  await stopHealthServer();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
