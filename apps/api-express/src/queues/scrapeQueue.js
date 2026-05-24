import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@vahan360/contracts';
import { config } from '../config.js';

let queue;

export function getScrapeQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAMES.SCRAPE, {
      connection: { url: config.redisUrl },
    });
  }
  return queue;
}
