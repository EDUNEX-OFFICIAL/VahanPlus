import { Queue } from 'bullmq';
import { getPrisma, disconnectPrisma } from '@vahan360/db';
import { QUEUE_NAMES } from '@vahan360/contracts';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const LIMIT = Number(process.env.LIMIT || '100');

const queue = new Queue(QUEUE_NAMES.SCRAPE, { connection: { url: redisUrl } });
const prisma = getPrisma();

const before = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
console.log('Before:', before);

if (before.paused > 0 || (await queue.isPaused())) {
  await queue.resume();
  console.log('Queue resumed');
}

// Remove pending MCV jobs from Bull (keep other job types if any in waiting)
const states = ['delayed', 'waiting', 'paused'];
let removed = 0;
for (const state of states) {
  const jobs = await queue.getJobs([state], 0, 5000);
  for (const job of jobs) {
    if (job.data?.type === 'bihar_mcv_vehicle_status') {
      await job.remove();
      removed += 1;
    }
  }
}
console.log('Removed MCV jobs from Bull:', removed);

// Mark all pending MCV scrape jobs failed in DB (clean slate for limited backfill)
const cancelled = await prisma.scrapeJob.updateMany({
  where: { type: 'bihar_mcv_vehicle_status', status: 'pending' },
  data: { status: 'failed', error: 'Cancelled — reset to limited backfill' },
});
console.log('Cancelled pending DB scrape jobs:', cancelled.count);

const after = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
console.log('After cleanup:', after);

await queue.close();
await disconnectPrisma();

console.log(`\nNow run: pnpm --filter @vahan360/worker backfill:vehicle-status -- --limit ${LIMIT}`);
console.log('Ensure worker is running (pnpm dev)');
