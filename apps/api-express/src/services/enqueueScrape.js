import { getScrapeQueue } from '../queues/scrapeQueue.js';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {{ type: string; target: string; metadata?: Record<string, unknown> }} payload
 */
export async function enqueueScrapeJob(prisma, payload) {
  const { type, target, metadata } = payload;

  const job = await prisma.scrapeJob.create({
    data: { type, target, status: 'pending' },
  });

  const queue = getScrapeQueue();
  await queue.resume();

  const bullJob = await queue.add(
    'scrape',
    { jobId: job.id, type, target, metadata },
    { jobId: job.id },
  );

  await prisma.scrapeJob.update({
    where: { id: job.id },
    data: { bullJobId: String(bullJob.id) },
  });

  return job;
}
