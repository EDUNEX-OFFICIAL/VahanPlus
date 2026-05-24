const BULK_CHUNK = 100;

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {import('bullmq').Queue} queue
 * @param {{
 *   type: string;
 *   items: unknown[];
 *   getTarget: (item: unknown) => string;
 *   getMetadata: (item: unknown, scrapeJobId: string) => Record<string, unknown>;
 *   getDelayMs?: (index: number) => number;
 * }} options
 */
export async function bulkEnqueueScrapeJobs(prisma, queue, options) {
  const { type, items, getTarget, getMetadata, getDelayMs } = options;
  if (items.length === 0) {
    return { enqueued: 0 };
  }

  let enqueued = 0;

  for (let offset = 0; offset < items.length; offset += BULK_CHUNK) {
    const chunk = items.slice(offset, offset + BULK_CHUNK);
    const scrapeJobs = await prisma.$transaction(
      chunk.map((item) =>
        prisma.scrapeJob.create({
          data: { type, target: getTarget(item), status: 'pending' },
        }),
      ),
    );

    const bulkJobs = scrapeJobs.map((scrapeJob, idx) => {
      const globalIndex = offset + idx;
      const delayMs = getDelayMs?.(globalIndex) ?? 0;
      const item = chunk[idx];
      return {
        name: type,
        data: {
          jobId: scrapeJob.id,
          type,
          target: scrapeJob.target,
          metadata: getMetadata(item, scrapeJob.id),
        },
        opts: {
          jobId: scrapeJob.id,
          ...(delayMs > 0 ? { delay: delayMs } : {}),
        },
      };
    });

    await queue.addBulk(bulkJobs);
    enqueued += chunk.length;
  }

  return { enqueued };
}
