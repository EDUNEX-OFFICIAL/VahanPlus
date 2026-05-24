import express from 'express';
import {
  KhananScraperConfigPatchSchema,
} from '@vahanplus/contracts';
import { getPrisma } from '@vahanplus/db';
import {
  CONFIG_ID,
  clearKhananConfigCache,
  detectSpeedPreset,
  getSpeedPreset,
  loadKhananConfig,
  scheduleReportDateIso,
} from '@vahanplus/khanan-config';
import { eachIsoDayInclusive, isoToPortalDate, parseIsoDate } from '@vahanplus/scraper-bihar-epass';
import {
  enqueueChallanPassJobs,
  enqueueConsignerJobsForSnapshot,
  enqueueMissingVehicleStatusFromPasses,
} from '@vahanplus/epass-orchestrator';
import { requireAuth } from '../middleware/auth.js';
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

  const scrapeJobsByStatus = Object.fromEntries(
    jobGroups.map((g) => [g.status, g._count._all]),
  );

  return {
    queue: { ...counts, isPaused },
    scrapeJobsByStatus,
    latestSnapshot: latestSnapshot
      ? {
          id: latestSnapshot.id,
          reportDate: latestSnapshot.reportDate,
          scrapedAt: latestSnapshot.scrapedAt.toISOString(),
        }
      : null,
  };
}

router.get('/', async (_req, res) => {
  const prisma = getPrisma();
  const cfg = await loadKhananConfig(prisma);
  const status = await buildStatus(prisma);
  res.json({
    config: mapConfigResponse(cfg),
    status,
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
    status,
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

export default router;
