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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until the queue has no waiting/active/delayed/paused jobs (post-obliterate).
 *
 * @param {BullQueue} queue
 * @param {{ maxAttempts?: number; delayMs?: number }} [opts]
 */
async function waitForQueueDrained(queue, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 5;
  const delayMs = opts.delayMs ?? 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remaining = await countQueuedJobs(queue);
    if (remaining === 0) {
      return { ready: true, remaining: 0 };
    }
    await sleep(delayMs);
  }

  const remaining = await countQueuedJobs(queue);
  return { ready: remaining === 0, remaining };
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
  const drain = await waitForQueueDrained(queue);
  return { removedFromQueue, queueReady: drain.ready, queueRemaining: drain.remaining };
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
