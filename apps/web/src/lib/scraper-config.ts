import { API_URL, apiFetch, clearSession } from '@/lib/api';
import type {
  ActionResult,
  ClearDataResult,
  KhananScraperConfigPatch,
  LiveSnapshotRow,
  ScraperConfigResponse,
  ScraperJobListItem,
  ScraperLiveResponse,
} from '@/lib/scraper-config-types';

export class ScraperConfigActionError extends Error {
  requiresConfirm?: boolean;
  dayCount?: number;

  constructor(message: string, opts?: { requiresConfirm?: boolean; dayCount?: number }) {
    super(message);
    this.name = 'ScraperConfigActionError';
    this.requiresConfirm = opts?.requiresConfirm;
    this.dayCount = opts?.dayCount;
  }
}

export const SCRAPER_CONFIG_QUERY_KEY = ['epass', 'scraper-config'] as const;
export const SCRAPER_JOBS_QUERY_KEY = ['epass', 'scraper-config', 'jobs'] as const;
export const SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY = [
  'epass',
  'scraper-config',
  'snapshot-history',
] as const;
export const SCRAPER_LIVE_QUERY_KEY = ['epass', 'scraper-config', 'live'] as const;

export function fetchScraperConfig() {
  return apiFetch<ScraperConfigResponse>('/epass/scraper-config');
}

export function patchScraperConfig(body: KhananScraperConfigPatch) {
  return apiFetch<ScraperConfigResponse>('/epass/scraper-config', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchScraperJobs(limit = 25, scope: 'portal' | 'all' = 'portal') {
  const q = new URLSearchParams({ limit: String(limit) });
  if (scope !== 'portal') q.set('scope', scope);
  return apiFetch<{ items: ScraperJobListItem[] }>(`/epass/scraper-config/jobs?${q.toString()}`);
}

export function fetchScraperSnapshotHistory(limit = 50) {
  return apiFetch<{ items: LiveSnapshotRow[] }>(
    `/epass/scraper-config/snapshot-history?limit=${limit}`,
  );
}

export function runDistrictScrape(date?: string) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/run-district', {
    method: 'POST',
    body: JSON.stringify(date ? { date } : {}),
  });
}

export async function runDistrictRange(
  from: string,
  to: string,
  confirmLargeRange?: boolean,
): Promise<ActionResult> {
  const res = await fetch(`${API_URL}/epass/scraper-config/actions/run-district-range`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, confirmLargeRange: confirmLargeRange ?? false }),
  });
  const body = (await res.json().catch(() => ({}))) as ActionResult & {
    error?: string;
    requiresConfirm?: boolean;
    dayCount?: number;
  };
  if (!res.ok) {
    if (res.status === 401) {
      await clearSession();
      if (typeof window !== 'undefined') {
        window.location.replace('/login?session=expired');
      }
      throw new Error('Session expired');
    }
    throw new ScraperConfigActionError(body.error || 'Failed', {
      requiresConfirm: body.requiresConfirm,
      dayCount: body.dayCount,
    });
  }
  return body;
}

export function fanoutConsigners(snapshotId?: string) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/fanout-consigners', {
    method: 'POST',
    body: JSON.stringify(snapshotId ? { snapshotId } : {}),
  });
}

export function fanoutPasses(snapshotId?: string, missingOnly = false) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/fanout-passes', {
    method: 'POST',
    body: JSON.stringify({ snapshotId, missingOnly }),
  });
}

export function backfillVehicleStatus(limit: number) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/backfill-vehicle-status', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
}

export function stopScraping() {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/stop-scraping', {
    method: 'POST',
  });
}

export function pauseScrapeQueue() {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/pause-queue', {
    method: 'POST',
  });
}

export function resumeScrapeQueue() {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/resume-queue', {
    method: 'POST',
  });
}

export function fetchScraperLive() {
  return apiFetch<ScraperLiveResponse>('/epass/scraper-config/live');
}

export function clearAllData(confirmPhrase: string) {
  return apiFetch<ClearDataResult>('/epass/scraper-config/actions/clear-data', {
    method: 'POST',
    body: JSON.stringify({ confirmPhrase }),
  });
}
