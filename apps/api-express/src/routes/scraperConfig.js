import express from 'express';
import { KhananScraperConfigPatchSchema } from '@vahanplus/contracts';
import { getPrisma } from '@vahanplus/db';
import {
  CONFIG_ID,
  clearKhananConfigCache,
  detectSpeedPreset,
  getSpeedPreset,
  loadKhananConfig,
} from '@vahanplus/khanan-config';
import { eachIsoDayInclusive, isoToPortalDate, parseIsoDate } from '@vahanplus/scraper-bihar-epass';
import {
  enqueueChallanPassJobs,
  enqueueConsignerJobsForSnapshot,
  enqueueMissingVehicleStatusFromPasses,
} from '@vahanplus/epass-orchestrator';
import { requireAuth } from '../middleware/auth.js';
import { stopScrapeQueue } from '../queues/queueMaintenance.js';
import { clearAllScrapedData } from '../services/clearScrapedData.js';
import { getScrapeQueue } from '../queues/scrapeQueue.js';
import { enqueueScrapeJob } from '../services/enqueueScrape.js';
import { syncEpassSchedule } from '../scheduler/epassSchedule.js';

const router = express.Router();
const LARGE_RANGE_CONFIRM_THRESHOLD = 90;

router.use(requireAuth);

/**
 * @param {Record<string, unknown>} cfg
 * @param {string | undefined | null} isoDate
 */
function districtJobMetadata(cfg, isoDate) {
  const metadata = { limit: cfg.districtRowLimit };
  if (isoDate) {
    metadata.date = isoToPortalDate(isoDate);
    metadata.reportDateIso = isoDate;
  }
  return metadata;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Record<string, unknown>} cfg
 * @param {string} isoDate
 */
async function enqueueDistrictForIsoDate(prisma, cfg, isoDate) {
  if (isoDate && !parseIsoDate(isoDate)) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  return enqueueScrapeJob(prisma, {
    type: 'bihar_epass',
    target: cfg.districtReportUrl,
    metadata: districtJobMetadata(cfg, isoDate),
  });
}

function mapConfigResponse(cfg) {
  return {
    ...cfg,
    speedPreset: detectSpeedPreset(cfg),
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Array<{ id: string; reportDate: string; scrapedAt: Date; _count: { rows: number } }>} snapshots
 */
async function buildSnapshotLiveRows(prisma, snapshots) {
  if (!snapshots.length) return [];

  const snapshotIds = snapshots.map((s) => s.id);
  const consignerGroups =
    snapshotIds.length > 0
      ? await prisma.epassConsignerRow.groupBy({
          by: ['snapshotId'],
          where: { snapshotId: { in: snapshotIds } },
          _count: { _all: true },
        })
      : [];

  const consignerBySnapshot = Object.fromEntries(
    consignerGroups.map((g) => [g.snapshotId, g._count._all]),
  );

  const challanGroups =
    snapshotIds.length > 0
      ? await prisma.epassChallanRow.groupBy({
          by: ['consignerRowId'],
          where: { consignerRow: { snapshotId: { in: snapshotIds } } },
          _count: { _all: true },
        })
      : [];

  const consignerSnapshotMap = new Map();
  if (snapshotIds.length > 0) {
    const consigners = await prisma.epassConsignerRow.findMany({
      where: { snapshotId: { in: snapshotIds } },
      select: { id: true, snapshotId: true },
    });
    for (const c of consigners) {
      consignerSnapshotMap.set(c.id, c.snapshotId);
    }
  }

  const challanBySnapshot = {};
  for (const g of challanGroups) {
    const snapId = consignerSnapshotMap.get(g.consignerRowId);
    if (!snapId) continue;
    challanBySnapshot[snapId] = (challanBySnapshot[snapId] ?? 0) + g._count._all;
  }

  const passGroups =
    snapshotIds.length > 0
      ? await prisma.epassChallanPassRow.groupBy({
          by: ['challanRowId'],
          where: {
            challanRow: { consignerRow: { snapshotId: { in: snapshotIds } } },
          },
          _count: { _all: true },
        })
      : [];

  const challanConsignerMap = new Map();
  if (snapshotIds.length > 0) {
    const challans = await prisma.epassChallanRow.findMany({
      where: { consignerRow: { snapshotId: { in: snapshotIds } } },
      select: { id: true, consignerRowId: true },
    });
    for (const ch of challans) {
      challanConsignerMap.set(ch.id, ch.consignerRowId);
    }
  }

  const passBySnapshot = {};
  for (const g of passGroups) {
    const consignerId = challanConsignerMap.get(g.challanRowId);
    const snapId = consignerId ? consignerSnapshotMap.get(consignerId) : null;
    if (!snapId) continue;
    passBySnapshot[snapId] = (passBySnapshot[snapId] ?? 0) + g._count._all;
  }

  const reportDateGroups = new Map();
  for (const s of snapshots) {
    const list = reportDateGroups.get(s.reportDate) ?? [];
    list.push(s);
    reportDateGroups.set(s.reportDate, list);
  }

  return snapshots.map((s) => ({
    id: s.id,
    reportDate: s.reportDate,
    scrapedAt: s.scrapedAt.toISOString(),
    districtRows: s._count.rows,
    consignerRows: consignerBySnapshot[s.id] ?? 0,
    challanRows: challanBySnapshot[s.id] ?? 0,
    passRows: passBySnapshot[s.id] ?? 0,
    snapshotCountForDate: reportDateGroups.get(s.reportDate)?.length ?? 1,
  }));
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} snapshotId
 */
async function snapshotRowCounts(prisma, snapshotId) {
  const snap = await prisma.epassSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      reportDate: true,
      scrapedAt: true,
      _count: { select: { rows: true } },
    },
  });
  if (!snap) return null;
  const rows = await buildSnapshotLiveRows(prisma, [snap]);
  const row = rows[0];
  if (!row) return null;
  return {
    districtRows: row.districtRows,
    consignerRows: row.consignerRows,
    challanRows: row.challanRows,
    passRows: row.passRows,
  };
}

async function buildStatus(prisma) {
  const queue = getScrapeQueue();
  const [counts, isPaused, jobGroups, latestSnapshot] = await Promise.all([
    queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
    queue.isPaused(),
    prisma.scrapeJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.epassSnapshot.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { id: true, reportDate: true, scrapedAt: true },
    }),
  ]);

  const scrapeJobsByStatus = Object.fromEntries(jobGroups.map((g) => [g.status, g._count._all]));

  const latestSnapshotDto = latestSnapshot
    ? {
        id: latestSnapshot.id,
        reportDate: latestSnapshot.reportDate,
        scrapedAt: latestSnapshot.scrapedAt.toISOString(),
      }
    : null;

  const latestSnapshotStats = latestSnapshot
    ? await snapshotRowCounts(prisma, latestSnapshot.id)
    : null;

  return {
    queue: { ...counts, isPaused },
    scrapeJobsByStatus,
    latestSnapshot: latestSnapshotDto,
    latestSnapshotStats,
  };
}

router.get('/', async (_req, res) => {
  const prisma = getPrisma();
  const cfg = await loadKhananConfig(prisma);
  const status = await buildStatus(prisma);
  res.json({
    config: mapConfigResponse(cfg),
    status: {
      ...status,
      allowDataWipe: isDataWipeAllowed(cfg),
    },
  });
});

router.patch('/', async (req, res) => {
  const parsed = KhananScraperConfigPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid config', details: parsed.error.flatten() });
  }

  const prisma = getPrisma();
  const existing = await prisma.khananScraperConfig.findUnique({ where: { id: CONFIG_ID } });

  if (!existing) {
    return res.status(404).json({ error: 'Config not seeded. Run db:seed.' });
  }

  const { speedPreset, ...patch } = parsed.data;
  const presetFields = speedPreset ? getSpeedPreset(speedPreset) : {};

  const updated = await prisma.khananScraperConfig.update({
    where: { id: CONFIG_ID },
    data: {
      ...patch,
      ...presetFields,
      configVersion: { increment: 1 },
    },
  });

  clearKhananConfigCache();
  await syncEpassSchedule(prisma);

  const cfg = await loadKhananConfig(prisma);
  const status = await buildStatus(prisma);

  res.json({
    config: mapConfigResponse(cfg),
    status: {
      ...status,
      allowDataWipe: isDataWipeAllowed(cfg),
    },
    configVersion: updated.configVersion,
  });
});

router.get('/jobs', async (req, res) => {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

  const jobs = await prisma.scrapeJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      target: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    items: jobs.map((j) => ({
      ...j,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    })),
  });
});

router.post('/actions/run-district', async (req, res) => {
  const prisma = getPrisma();
  const cfg = await loadKhananConfig(prisma);
  const rawDate = typeof req.body?.date === 'string' ? req.body.date.trim() : '';
  const isoDate = rawDate || null;

  if (isoDate && !parseIsoDate(isoDate)) {
    return res.status(400).json({ error: 'Invalid date. Use yyyy-mm-dd.' });
  }

  try {
    const job = await enqueueDistrictForIsoDate(prisma, cfg, isoDate);
    res.status(201).json({
      jobId: job.id,
      type: job.type,
      status: job.status,
      date: isoDate,
      enqueued: 1,
      message: isoDate ? `Queued district report for ${isoDate}` : 'Queued district report',
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid date' });
  }
});

router.post('/actions/run-district-range', async (req, res) => {
  const prisma = getPrisma();
  const cfg = await loadKhananConfig(prisma);
  const from = typeof req.body?.from === 'string' ? req.body.from.trim() : '';
  const to = typeof req.body?.to === 'string' ? req.body.to.trim() : '';
  const confirmLargeRange = Boolean(req.body?.confirmLargeRange);

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required (yyyy-mm-dd).' });
  }

  let days;
  try {
    days = eachIsoDayInclusive(from, to);
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : 'Invalid date range',
    });
  }

  if (days.length > LARGE_RANGE_CONFIRM_THRESHOLD && !confirmLargeRange) {
    return res.status(400).json({
      error: 'Large date range',
      dayCount: days.length,
      requiresConfirm: true,
    });
  }

  let enqueued = 0;
  try {
    for (const iso of days) {
      await enqueueDistrictForIsoDate(prisma, cfg, iso);
      enqueued += 1;
    }
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Enqueue failed' });
  }

  await prisma.khananScraperConfig.update({
    where: { id: CONFIG_ID },
    data: {
      districtRangeFrom: from,
      districtRangeTo: to,
      defaultDistrictDate: to,
    },
  });
  clearKhananConfigCache();

  res.status(201).json({
    enqueued,
    from,
    to,
    message: `Queued ${enqueued} district reports`,
  });
});

router.post('/actions/fanout-consigners', async (req, res) => {
  const prisma = getPrisma();
  let snapshotId = req.body?.snapshotId;

  if (!snapshotId) {
    const latest = await prisma.epassSnapshot.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { id: true },
    });
    snapshotId = latest?.id;
  }

  if (!snapshotId) {
    return res.status(400).json({ error: 'No snapshot found. Run a district report first.' });
  }

  const fanout = await enqueueConsignerJobsForSnapshot(prisma, snapshotId);
  res.json({ snapshotId, ...fanout });
});

router.post('/actions/fanout-passes', async (req, res) => {
  const prisma = getPrisma();
  let snapshotId = req.body?.snapshotId;
  const missingOnly = Boolean(req.body?.missingOnly);

  if (!snapshotId) {
    const latest = await prisma.epassSnapshot.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { id: true },
    });
    snapshotId = latest?.id;
  }

  if (!snapshotId) {
    return res.status(400).json({ error: 'No snapshot found.' });
  }

  const challanWhere = {
    consignerRow: { snapshotId },
    detailUrl: { not: null },
    challanCount: { gt: 0 },
  };
  if (missingOnly) {
    challanWhere.passes = { none: {} };
  }

  const challanRows = await prisma.epassChallanRow.findMany({
    where: challanWhere,
    select: { id: true, detailUrl: true, challanCount: true },
  });

  const fanout = await enqueueChallanPassJobs(prisma, challanRows);
  res.json({
    snapshotId,
    eligible: challanRows.length,
    ...fanout,
  });
});

router.post('/actions/backfill-vehicle-status', async (req, res) => {
  const prisma = getPrisma();
  const rawLimit = Number(req.body?.limit ?? 100);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 100;

  const fanout = await enqueueMissingVehicleStatusFromPasses(prisma, { limit });
  res.json({ limit, ...fanout });
});

router.post('/actions/pause-queue', async (_req, res) => {
  const queue = getScrapeQueue();
  await queue.pause();
  res.json({ paused: true, message: 'Queue paused. Running jobs may finish; new jobs will wait.' });
});

router.post('/actions/resume-queue', async (_req, res) => {
  const queue = getScrapeQueue();
  await queue.resume();
  res.json({ paused: false, message: 'Queue resumed.' });
});

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
async function stopScrapingQueue(prisma) {
  const queue = getScrapeQueue();
  const queueResult = await stopScrapeQueue(queue);
  const cancelled = await prisma.scrapeJob.updateMany({
    where: { status: { in: ['pending', 'active'] } },
    data: { status: 'failed', error: 'Stopped by operator' },
  });
  return {
    removedFromQueue: queueResult.removedFromQueue,
    cancelledJobs: cancelled.count,
    queueReady: queueResult.queueReady,
    queueRemaining: queueResult.queueRemaining,
    message: `Stopped. Cleared ${queueResult.removedFromQueue} queue job(s); cancelled ${cancelled.count} scrape job(s). Use Run scrapper to start again.`,
  };
}

router.post('/actions/stop-scraping', async (_req, res) => {
  const prisma = getPrisma();
  const result = await stopScrapingQueue(prisma);
  res.json(result);
});

router.get('/live', async (_req, res) => {
  const prisma = getPrisma();
  const queue = getScrapeQueue();
  const status = await buildStatus(prisma);

  const snapshots = await prisma.epassSnapshot.findMany({
    orderBy: [{ reportDate: 'desc' }, { scrapedAt: 'desc' }],
    take: 8,
    select: {
      id: true,
      reportDate: true,
      scrapedAt: true,
      _count: { select: { rows: true } },
    },
  });

  const activeBullJobs = await queue.getJobs(['active'], 0, 20);
  const activeJobs = activeBullJobs.map((job) => ({
    id: job.id,
    type: job.data?.type ?? 'unknown',
    target: job.data?.target ?? '',
    progress: job.progress,
    data: job.data?.metadata ?? job.data ?? null,
  }));

  const snapshotRows = await buildSnapshotLiveRows(prisma, snapshots);

  res.json({
    queue: status.queue,
    scrapeJobsByStatus: status.scrapeJobsByStatus,
    snapshots: snapshotRows,
    activeJobs,
  });
});

const CLEAR_DATA_PHRASE = 'DELETE ALL DATA';

/**
 * @param {Record<string, unknown>} cfg
 */
function isDataWipeAllowed(cfg) {
  if (process.env.ALLOW_DATA_WIPE === 'false') return false;
  return Boolean(cfg?.allowDataWipe);
}

router.post('/actions/clear-data', async (req, res) => {
  const prisma = getPrisma();
  const cfg = await loadKhananConfig(prisma);

  if (!isDataWipeAllowed(cfg)) {
    return res.status(403).json({
      error: 'Data wipe disabled. Enable "Allow clear all data" in Khanan Config.',
    });
  }

  if (req.body?.confirmPhrase !== CLEAR_DATA_PHRASE) {
    return res.status(400).json({
      error: `Confirmation required. Send confirmPhrase: "${CLEAR_DATA_PHRASE}"`,
    });
  }

  const queue = getScrapeQueue();
  const result = await clearAllScrapedData(prisma, queue);
  res.json(result);
});

export default router;
