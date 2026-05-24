import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@vahanplus/contracts';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const queue = new Queue(QUEUE_NAMES.SCRAPE, { connection: { url: redisUrl } });

const counts = await queue.getJobCounts(
  'waiting',
  'active',
  'completed',
  'failed',
  'delayed',
  'paused',
);
console.log('BullMQ job counts:', counts);

const delayed = await queue.getJobs(['delayed'], 0, 2);
const waiting = await queue.getJobs(['waiting'], 0, 2);
console.log(
  'Sample delayed:',
  delayed.map((j) => ({ id: j.id, name: j.name, delay: j.delay, ts: j.timestamp })),
);
console.log(
  'Sample waiting:',
  waiting.map((j) => ({ id: j.id, name: j.name, data: j.data?.type })),
);

await queue.close();
