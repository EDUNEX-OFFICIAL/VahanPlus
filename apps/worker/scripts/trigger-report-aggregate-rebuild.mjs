#!/usr/bin/env node
/**
 * Backfill all CQRS reporting summary tables from historical snapshots.
 * Usage: node apps/worker/scripts/trigger-report-aggregate-rebuild.mjs
 */
import '../src/loadEnv.js';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@vahanplus/contracts';
import { getQueueConnection } from '@vahanplus/epass-orchestrator';

const queue = new Queue(QUEUE_NAMES.REPORT_AGGREGATE, { connection: getQueueConnection() });

const job = await queue.add(
  'report_aggregate_rebuild',
  { trigger: 'rebuild', jobVersion: 1 },
  { jobId: `rebuild-${Date.now()}` },
);

console.log(`Enqueued report aggregate rebuild: ${job.id}`);
await queue.close();
process.exit(0);
