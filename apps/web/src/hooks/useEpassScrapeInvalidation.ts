'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { scrapeWorkInFlight } from '@/lib/scraper-control-mode';
import { invalidateEpassReportingData, pollingQueryOptions } from '@/lib/query-config';
import { SCRAPER_CONFIG_QUERY_KEY, fetchScraperConfig } from '@/lib/scraper-config';

const IDLE_POLL_MS = 60_000;
const ACTIVE_POLL_MS = 10_000;

/** Invalidate reporting caches when a background scrape finishes (any page). */
export function useEpassScrapeInvalidation(enabled: boolean): void {
  const queryClient = useQueryClient();
  const prevWorkRef = useRef<number | null>(null);

  const { data } = useQuery({
    queryKey: SCRAPER_CONFIG_QUERY_KEY,
    queryFn: fetchScraperConfig,
    enabled,
    ...pollingQueryOptions,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return IDLE_POLL_MS;
      return scrapeWorkInFlight(status) > 0 ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    },
  });

  useEffect(() => {
    if (!enabled || !data?.status) return;

    const work = scrapeWorkInFlight(data.status);
    const prev = prevWorkRef.current;
    prevWorkRef.current = work;

    if (prev !== null && prev > 0 && work === 0) {
      void invalidateEpassReportingData(queryClient);
    }
  }, [enabled, data?.status, queryClient]);
}
