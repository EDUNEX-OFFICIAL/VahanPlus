import type { LiveSnapshotRow } from '@/lib/scraper-config-types';

export const HISTORY_FETCH_LIMIT = 25;
export const HISTORY_JOBS_FETCH_LIMIT = 20;
export const HISTORY_INITIAL_VISIBLE = 8;
export const HISTORY_SHOW_MORE_STEP = 8;
export const HISTORY_SCROLL_CLASS =
  'max-h-[min(40vh,360px)] overflow-y-auto overscroll-contain scrollbar-thin';

/** One row per report date — latest scrapedAt wins; preserves snapshotCountForDate. */
export function dedupeHistorySnapshotsByReportDate(rows: LiveSnapshotRow[]): LiveSnapshotRow[] {
  const byDate = new Map<string, LiveSnapshotRow>();

  for (const row of rows) {
    const prev = byDate.get(row.reportDate);
    if (!prev || new Date(row.scrapedAt) > new Date(prev.scrapedAt)) {
      byDate.set(row.reportDate, row);
    }
  }

  return [...byDate.values()].sort(
    (a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime(),
  );
}

export function sliceForHistoryPreview<T>(items: T[], visibleCount: number): T[] {
  return items.slice(0, Math.max(0, visibleCount));
}
