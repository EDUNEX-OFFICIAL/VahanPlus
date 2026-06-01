/** @typedef {import('bullmq').Queue} BullQueue */

/**
 * @param {BullQueue} queue
 */
async function countQueuedJobs(queue) {
  const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'paused');
  return (
    (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0) + (counts.paused ?? 0)
  );
}

/**
 * End scraping: remove all Bull jobs (including active) and leave the queue ready for a new run.
 *
 * @param {BullQueue} queue
 */
export async function stopScrapeQueue(queue) {
  const removedFromQueue = await countQueuedJobs(queue);
  await queue.obliterate({ force: true });
  await queue.resume();
  return { removedFromQueue };
}

/**
 * Remove every job in the scrape queue (including active). Resumes the queue when done.
 *
 * @param {BullQueue} queue
 */
export async function obliterateScrapeQueue(queue) {
  await stopScrapeQueue(queue);
}
