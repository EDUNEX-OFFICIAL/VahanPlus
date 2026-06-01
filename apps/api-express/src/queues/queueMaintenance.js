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

const REPEATABLE_JOB_ID = 'bihar-epass-repeatable';

/**
 * Remove scheduled district scrape repeatables so a wipe is not immediately refilled.
 *
 * @param {BullQueue} queue
 */
export async function removeRepeatableScrapeJobs(queue) {
  const repeatables = await queue.getRepeatableJobs();
  for (const job of repeatables) {
    if (job.id === REPEATABLE_JOB_ID || job.name === 'bihar-epass-scheduled') {
      await queue.removeRepeatableByKey(job.key);
    }
  }
}
