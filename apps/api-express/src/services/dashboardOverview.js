import { getScrapeQueue } from '../queues/scrapeQueue.js';
import { buildSnapshotLiveRows, snapshotRowCounts } from './snapshotLiveRows.js';

const SNAPSHOT_SELECT = {
  id: true,
  reportDate: true,
  scrapedAt: true,
  sourceUrl: true,
  _count: { select: { rows: true } },
};

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
export async function buildDashboardOverview(prisma) {
  const queue = getScrapeQueue();

  const [
    queueCounts,
    isPaused,
    jobGroups,
    snapshotCount,
    latestSnapshot,
    recentSnapshotsRaw,
    vehicleTotal,
    vehicleFound,
    vehicleNotFound,
    vehicleLatest,
    crmActive,
    crmManual,
    crmRemoved,
  ] = await Promise.all([
    queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
    queue.isPaused(),
    prisma.scrapeJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.epassSnapshot.count(),
    prisma.epassSnapshot.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { id: true, reportDate: true, scrapedAt: true, sourceUrl: true },
    }),
    prisma.epassSnapshot.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 5,
      select: SNAPSHOT_SELECT,
    }),
    prisma.epassVehicleStatusRow.count(),
    prisma.epassVehicleStatusRow.count({ where: { found: true } }),
    prisma.epassVehicleStatusRow.count({ where: { found: false } }),
    prisma.epassVehicleStatusRow.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { scrapedAt: true },
    }),
    prisma.crmVehicleExpiryEntry.count({ where: { status: 'active' } }),
    prisma.crmVehicleExpiryEntry.count({
      where: { status: 'active', source: 'manual' },
    }),
    prisma.crmVehicleExpiryEntry.count({ where: { status: 'removed' } }),
  ]);

  const scrapeJobsByStatus = Object.fromEntries(jobGroups.map((g) => [g.status, g._count._all]));

  const latestSnapshotDto = latestSnapshot
    ? {
        id: latestSnapshot.id,
        reportDate: latestSnapshot.reportDate,
        scrapedAt: latestSnapshot.scrapedAt.toISOString(),
        sourceUrl: latestSnapshot.sourceUrl ?? null,
      }
    : null;

  const latestSnapshotStats = latestSnapshot
    ? await snapshotRowCounts(prisma, latestSnapshot.id)
    : null;

  const recentSnapshots = await buildSnapshotLiveRows(prisma, recentSnapshotsRaw);

  return {
    queue: { ...queueCounts, isPaused },
    scrapeJobsByStatus,
    snapshotCount,
    latestSnapshot: latestSnapshotDto,
    latestSnapshotStats,
    recentSnapshots,
    vehicles: {
      total: vehicleTotal,
      found: vehicleFound,
      notFound: vehicleNotFound,
      lastScrapedAt: vehicleLatest?.scrapedAt?.toISOString() ?? null,
    },
    crm: {
      activeEntries: crmActive,
      manualEntries: crmManual,
      removedEntries: crmRemoved,
    },
    generatedAt: new Date().toISOString(),
  };
}
