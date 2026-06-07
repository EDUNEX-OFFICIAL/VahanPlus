import type { ScraperConfigStatus } from '@/lib/scraper-config-types';

export type ScraperControlMode = 'idle' | 'running' | 'paused' | 'stopping';

export function scrapeQueueInProgress(status: ScraperConfigStatus): number {
  const q = status.queue;
  return (q.waiting ?? 0) + (q.active ?? 0);
}

function dbJobsInFlight(status: ScraperConfigStatus): number {
  const by = status.scrapeJobsByStatus ?? {};
  return (by.pending ?? 0) + (by.active ?? 0);
}

/** Queue + DB jobs still running (used for global scrape-complete detection). */
export function scrapeWorkInFlight(status: ScraperConfigStatus): number {
  return scrapeQueueInProgress(status) + dbJobsInFlight(status);
}

/** Queue + DB idle enough to leave post-stop cooldown. */
export function isScraperQueueReady(status: ScraperConfigStatus): boolean {
  if (status.queue.isPaused) return false;
  if (scrapeQueueInProgress(status) > 0) return false;
  if (dbJobsInFlight(status) > 0) return false;
  return true;
}

export function getScraperControlMode(
  status: ScraperConfigStatus,
  options?: { stopCooldown?: boolean; optimisticRunning?: boolean },
): ScraperControlMode {
  if (options?.stopCooldown) return 'stopping';

  const q = status.queue;
  const inProgress = scrapeQueueInProgress(status);

  if (q.isPaused) return 'paused';

  if (inProgress > 0 || options?.optimisticRunning) return 'running';

  return 'idle';
}

export function canStartScrape(mode: ScraperControlMode, busy: boolean): boolean {
  return mode === 'idle' && !busy;
}
