'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { fetchEpassFilterOptions, fetchEpassSnapshotReportDates } from '@/lib/epass';
import { EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY } from '@/lib/epass';
import { EPASS_FILTER_OPTIONS_ALL_PARAMS, staticQueryOptions } from '@/lib/query-config';

const EPASS_FILTER_OPTIONS_ALL_KEY = [
  'epass',
  'filter-options',
  EPASS_FILTER_OPTIONS_ALL_PARAMS,
] as const;

const PREFETCH_ROUTES = new Set([
  '/khanan/consignee',
  '/khanan/consigner',
  '/khanan/district',
  '/khanan/challan',
  '/khanan/vehicle-data',
]);

/** Prefetch shared snapshot dates once per dashboard session. */
export function useEpassLayoutPrefetch(enabled: boolean): void {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  useEffect(() => {
    if (!enabled || prefetched.current) return;
    prefetched.current = true;

    void queryClient.prefetchQuery({
      queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
      queryFn: () => fetchEpassSnapshotReportDates(),
      ...staticQueryOptions,
    });
  }, [enabled, queryClient]);
}

/** Prefetch cheap reference data when hovering Khanan nav links. */
export function useEpassRoutePrefetch(): (href: string) => void {
  const queryClient = useQueryClient();

  return useCallback(
    (href: string) => {
      if (!PREFETCH_ROUTES.has(href)) return;

      void queryClient.prefetchQuery({
        queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
        queryFn: () => fetchEpassSnapshotReportDates(),
        ...staticQueryOptions,
      });

      void queryClient.prefetchQuery({
        queryKey: EPASS_FILTER_OPTIONS_ALL_KEY,
        queryFn: () => fetchEpassFilterOptions(EPASS_FILTER_OPTIONS_ALL_PARAMS),
        ...staticQueryOptions,
      });
    },
    [queryClient],
  );
}
