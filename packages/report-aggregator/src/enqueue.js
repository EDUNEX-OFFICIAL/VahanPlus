import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@vahanplus/contracts';
import { AGGREGATOR_VERSION } from './semantics.js';

let connection = null;

export function setQueueConnection(conn) {
  connection = conn;
}

function getQueue() {
  if (!connection) {
    throw new Error('report-aggregator: queue connection not set');
  }
  return new Queue(QUEUE_NAMES.REPORT_AGGREGATE, { connection });
}

/**
 * @param {string} snapshotId
 * @param {{ trigger?: string }} opts
 */
export async function enqueueReportAggregate(snapshotId, opts = {}) {
  if (!snapshotId) return null;
  const queue = getQueue();
  const jobId = `aggregate-${snapshotId}-v${AGGREGATOR_VERSION}`;
  const existing = await queue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'waiting' || state === 'active' || state === 'delayed') {
      return existing.id;
    }
  }
  const job = await queue.add(
    'report_aggregate',
    { snapshotId, trigger: opts.trigger ?? 'etl', jobVersion: AGGREGATOR_VERSION },
    { jobId, removeOnComplete: 100, removeOnFail: 50 },
  );
  return job.id;
}
