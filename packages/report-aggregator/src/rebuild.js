import { aggregateSnapshot } from './aggregateSnapshot.js';
import { AGGREGATOR_VERSION } from './semantics.js';

/**
 * Full historical backfill — processes snapshots oldest-first.
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {{ batchSize?: number, onProgress?: (n: number, total: number) => void }} opts
 */
export async function rebuildAllSummaries(prisma, opts = {}) {
  const batchSize = opts.batchSize ?? 50;
  const snapshots = await prisma.epassSnapshot.findMany({
    orderBy: [{ reportDate: 'asc' }, { scrapedAt: 'asc' }],
    select: { id: true },
  });

  const total = snapshots.length;
  let processed = 0;
  const results = [];

  for (let i = 0; i < snapshots.length; i += batchSize) {
    const batch = snapshots.slice(i, i + batchSize);
    for (const { id } of batch) {
      const result = await aggregateSnapshot(prisma, id, { trigger: 'rebuild' });
      results.push(result);
      processed += 1;
      opts.onProgress?.(processed, total);
    }
  }

  await prisma.reportAggregateCheckpoint.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      aggregatorVersion: AGGREGATOR_VERSION,
      lastSnapshotId: snapshots.at(-1)?.id,
    },
    update: { aggregatorVersion: AGGREGATOR_VERSION, lastSnapshotId: snapshots.at(-1)?.id },
  });

  return { processed, total, results };
}
