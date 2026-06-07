'use client';

import { useEpassLayoutPrefetch } from '@/hooks/useEpassNavPrefetch';

export function EpassQueryPrefetch({ enabled }: { enabled: boolean }) {
  useEpassLayoutPrefetch(enabled);
  return null;
}
