import type { DefaultOptions, QueryClient } from '@tanstack/react-query';
import { DASHBOARD_QUERY_KEY } from '@/lib/dashboard';
import {
  EPASS_LATEST_QUERY_KEY,
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  EPASS_SNAPSHOTS_QUERY_KEY,
} from '@/lib/epass';
import { CRM_CONFIG_QUERY_KEY } from '@/lib/crm-config-types';
import {
  SCRAPER_CONFIG_QUERY_KEY,
  SCRAPER_JOBS_QUERY_KEY,
  SCRAPER_LIVE_QUERY_KEY,
  SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY,
} from '@/lib/scraper-config';

/** Safety net for queries without an explicit tier. */
export const DEFAULT_STALE_MS = 5 * 60 * 1000;
export const DEFAULT_GC_MS = 30 * 60 * 1000;

/** Category A — static reference data (report dates, filter options). */
export const STATIC_STALE_MS = 30 * 60 * 1000;
export const STATIC_GC_MS = 60 * 60 * 1000;

/** Category B — reporting browse/list data. */
export const REPORTING_STALE_MS = 10 * 60 * 1000;
export const REPORTING_GC_MS = 30 * 60 * 1000;

/** Category C — operational / portal status data. */
export const LIVE_STALE_MS = 60 * 1000;
export const LIVE_GC_MS = 10 * 60 * 1000;

export const POLLING_STALE_MS = 30 * 1000;

export const VEHICLE_STATUS_QUERY_KEY = ['epass', 'vehicle-status'] as const;
export const CRM_EXPIRY_QUERY_KEY = ['crm', 'vehicle-expiry'] as const;

export const EPASS_FILTER_OPTIONS_ALL_PARAMS = { reportScope: 'all' as const };

export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (error.message.includes('503')) return false;
  return failureCount < 2;
}

export const queryClientDefaults = {
  staleTime: DEFAULT_STALE_MS,
  gcTime: DEFAULT_GC_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  retry: shouldRetryQuery,
} as const;

export const staticQueryOptions = {
  staleTime: STATIC_STALE_MS,
  gcTime: STATIC_GC_MS,
  refetchOnWindowFocus: false,
} as const satisfies NonNullable<DefaultOptions['queries']>;

export const reportingQueryOptions = {
  staleTime: REPORTING_STALE_MS,
  gcTime: REPORTING_GC_MS,
  refetchOnWindowFocus: false,
  retry: shouldRetryQuery,
} as const satisfies NonNullable<DefaultOptions['queries']>;

export const liveQueryOptions = {
  staleTime: LIVE_STALE_MS,
  gcTime: LIVE_GC_MS,
  refetchOnWindowFocus: false,
  retry: shouldRetryQuery,
} as const satisfies NonNullable<DefaultOptions['queries']>;

export const pollingQueryOptions = {
  staleTime: POLLING_STALE_MS,
  gcTime: LIVE_GC_MS,
  refetchOnWindowFocus: false,
} as const satisfies NonNullable<DefaultOptions['queries']>;

/** @deprecated Use staticQueryOptions / reportingQueryOptions from query-config. */
export const SNAPSHOTS_STALE_MS = STATIC_STALE_MS;

/** @deprecated Use reportingQueryOptions from query-config. */
export const EPASS_BROWSE_QUERY_OPTS = reportingQueryOptions;

export async function invalidateEpassReportingData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: EPASS_SNAPSHOTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: EPASS_LATEST_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'filter-options'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'snapshot-rows'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'consigner-list'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'consigner-options'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'consigners'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'challans'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'challan-pass-list'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'district-rows-browse'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'minerals-browse'] }),
    queryClient.invalidateQueries({ queryKey: ['epass', 'vehicle-data'] }),
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
  ]);
}

export async function invalidateEpassAndScraperData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    invalidateEpassReportingData(queryClient),
    queryClient.invalidateQueries({ queryKey: SCRAPER_CONFIG_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: SCRAPER_LIVE_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: SCRAPER_JOBS_QUERY_KEY }),
  ]);
}

export async function invalidateCrmConfig(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: CRM_CONFIG_QUERY_KEY });
}

export async function invalidateVehicleStatusData(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: VEHICLE_STATUS_QUERY_KEY });
}

export async function invalidateCrmExpiryData(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: CRM_EXPIRY_QUERY_KEY });
}

export async function invalidateAfterEpassImport(
  queryClient: QueryClient,
  options?: { refreshVehicleStatus?: boolean },
): Promise<void> {
  await invalidateEpassReportingData(queryClient);
  if (options?.refreshVehicleStatus) {
    await invalidateVehicleStatusData(queryClient);
  }
}
