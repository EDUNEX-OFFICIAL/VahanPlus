import type { QueryClient } from '@tanstack/react-query';
import { DEFAULT_STALE_MS } from '@/lib/query-config';

export type QueryMetrics = {
  fetches: number;
  cacheHits: number;
  cacheMisses: number;
};

declare global {
  interface Window {
    __vahanQueryMetrics?: QueryMetrics;
  }
}

function createMetrics(): QueryMetrics {
  return { fetches: 0, cacheHits: 0, cacheMisses: 0 };
}

function getMetrics(): QueryMetrics {
  if (typeof window === 'undefined') {
    return createMetrics();
  }
  if (!window.__vahanQueryMetrics) {
    window.__vahanQueryMetrics = createMetrics();
  }
  return window.__vahanQueryMetrics;
}

function shouldInstrument(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_QUERY_DEBUG === '1';
}

function formatQueryKey(queryKey: readonly unknown[]): string {
  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

export function attachQueryInstrumentation(queryClient: QueryClient): () => void {
  if (!shouldInstrument()) {
    return () => {};
  }

  const metrics = getMetrics();
  const cache = queryClient.getQueryCache();

  const unsubscribe = cache.subscribe((event) => {
    const query = event.query;
    if (!query) return;

    const key = formatQueryKey(query.queryKey);

    if (event.type === 'updated') {
      if (query.state.fetchStatus === 'fetching' && event.action.type === 'fetch') {
        metrics.fetches += 1;
        if (process.env.NODE_ENV === 'development') {
          console.debug('[query] fetch', key);
        }
      }

      if (
        query.state.status === 'success' &&
        query.state.fetchStatus === 'idle' &&
        query.state.dataUpdatedAt > 0 &&
        event.action.type === 'success'
      ) {
        const ageMs = Date.now() - query.state.dataUpdatedAt;
        const staleTime = (query.options as { staleTime?: number }).staleTime ?? DEFAULT_STALE_MS;
        if (ageMs < staleTime) {
          metrics.cacheHits += 1;
        } else {
          metrics.cacheMisses += 1;
        }
      }
    }
  });

  return unsubscribe;
}
