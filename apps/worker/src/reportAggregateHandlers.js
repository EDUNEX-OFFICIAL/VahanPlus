import { getPrisma } from '@vahanplus/db';
import {
  aggregateSnapshot,
  rebuildAllSummaries,
  setQueueConnection,
} from '@vahanplus/report-aggregator';
import { getQueueConnection } from '@vahanplus/epass-orchestrator';

setQueueConnection(getQueueConnection());

/**
 * @param {import('bullmq').Job} job
 */
export async function processReportAggregateJob(job) {
  const prisma = getPrisma();
  const { snapshotId, trigger, jobVersion } = job.data ?? {};

  const jobRecord = await prisma.reportAggregateJob.create({
    data: {
      snapshotId: snapshotId ?? null,
      jobVersion: jobVersion ?? 1,
      trigger: trigger ?? 'unknown',
      status: 'active',
    },
  });

  try {
    let result;
    if ((trigger === 'rebuild' || trigger === 'import') && !snapshotId) {
      result = await rebuildAllSummaries(prisma, {
        onProgress: (n, total) => {
          job.updateProgress(Math.floor((n / total) * 100));
        },
      });
    } else if (!snapshotId) {
      throw new Error('snapshotId required for aggregate job');
    } else {
      result = await aggregateSnapshot(prisma, snapshotId, { trigger });
    }

    await prisma.reportAggregateJob.update({
      where: { id: jobRecord.id },
      data: {
        status: 'completed',
        durationMs: result.durationMs ?? null,
        entitiesUpdated: result.entitiesUpdated ?? result.processed ?? null,
      },
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.reportAggregateJob.update({
      where: { id: jobRecord.id },
      data: { status: 'failed', error: message },
    });
    throw err;
  }
}

/**
 * Enqueue aggregation after ETL when snapshot data changed.
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string | undefined} snapshotId
 * @param {string} trigger
 */
export async function maybeEnqueueReportAggregate(snapshotId, trigger) {
  const { enqueueReportAggregate } = await import('@vahanplus/report-aggregator');
  if (!snapshotId && (trigger === 'rebuild' || trigger === 'import')) {
    const { Queue } = await import('bullmq');
    const { QUEUE_NAMES } = await import('@vahanplus/contracts');
    const { getQueueConnection } = await import('@vahanplus/epass-orchestrator');
    const queue = new Queue(QUEUE_NAMES.REPORT_AGGREGATE, { connection: getQueueConnection() });
    await queue.add(
      'report_aggregate_rebuild',
      { trigger, jobVersion: 1 },
      { jobId: `rebuild:${trigger}:${Date.now()}`, removeOnComplete: 20 },
    );
    await queue.close();
    return;
  }
  if (!snapshotId) return;
  await enqueueReportAggregate(snapshotId, { trigger });
}
