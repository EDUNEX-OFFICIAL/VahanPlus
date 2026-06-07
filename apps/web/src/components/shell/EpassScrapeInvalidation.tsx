'use client';

import { useEpassScrapeInvalidation } from '@/hooks/useEpassScrapeInvalidation';

export function EpassScrapeInvalidation({ enabled }: { enabled: boolean }) {
  useEpassScrapeInvalidation(enabled);
  return null;
}
