import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@vahan360/contracts';
import { DEFAULT_JOB_OPTIONS } from './config.js';

let queue;

export function getQueueConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  return { url: redisUrl };
}

export function getScrapeQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAMES.SCRAPE, {
      connection: getQueueConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return queue;
}
