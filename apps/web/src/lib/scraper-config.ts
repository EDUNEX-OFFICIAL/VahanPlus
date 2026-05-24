import { apiFetch } from '@/lib/api';
import type {
  ActionResult,
  KhananScraperConfigPatch,
  ScraperConfigResponse,
  ScraperJobListItem,
} from '@/lib/scraper-config-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export function fetchScraperConfig(token: string) {
  return apiFetch<ScraperConfigResponse>('/epass/scraper-config', { token });
}

export function patchScraperConfig(token: string, body: KhananScraperConfigPatch) {
  return apiFetch<ScraperConfigResponse>('/epass/scraper-config', {
    token,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchScraperJobs(token: string, limit = 25) {
  return apiFetch<{ items: ScraperJobListItem[] }>(
    `/epass/scraper-config/jobs?limit=${limit}`,
    { token },
  );
}

export function runDistrictScrape(token: string, date?: string) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/run-district', {
    token,
    method: 'POST',
    body: JSON.stringify(date ? { date } : {}),
  });
}

export async function runDistrictRange(
  token: string,
  from: string,
  to: string,
  confirmLargeRange?: boolean,
): Promise<ActionResult> {
  const res = await fetch(`${API_URL}/epass/scraper-config/actions/run-district-range`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ from, to, confirmLargeRange: confirmLargeRange ?? false }),
  });
  const body = (await res.json().catch(() => ({}))) as ActionResult & {
    error?: string;
    requiresConfirm?: boolean;
    dayCount?: number;
  };
  if (!res.ok) {
    throw new ScraperConfigActionError(body.error || 'Failed', {
      requiresConfirm: body.requiresConfirm,
      dayCount: body.dayCount,
    });
  }
  return body;
}

export function fanoutConsigners(token: string, snapshotId?: string) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/fanout-consigners', {
    token,
    method: 'POST',
    body: JSON.stringify(snapshotId ? { snapshotId } : {}),
  });
}

export function fanoutPasses(token: string, snapshotId?: string, missingOnly = false) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/fanout-passes', {
    token,
    method: 'POST',
    body: JSON.stringify({ snapshotId, missingOnly }),
  });
}

export function backfillVehicleStatus(token: string, limit: number) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/backfill-vehicle-status', {
    token,
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
}

export function pauseQueue(token: string) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/pause-queue', {
    token,
    method: 'POST',
  });
}

export function resumeQueue(token: string) {
  return apiFetch<ActionResult>('/epass/scraper-config/actions/resume-queue', {
    token,
    method: 'POST',
  });
}
