import {
  type EpassDateFilterInput,
  hasActiveDateRangeWithNoSnapshots,
} from '@/lib/epass-report-date';

export type EpassBrowseEmptyReason = 'no-reports' | 'date-range';

/** True when the browse page should show the main empty state (not just an empty table). */
export function isEpassBrowseEmpty<T extends { reportDate: string }>(
  snapshots: T[] | undefined,
  filters: EpassDateFilterInput,
): boolean {
  if (snapshots == null) return false;
  if (snapshots.length === 0) return true;
  return hasActiveDateRangeWithNoSnapshots(snapshots, filters);
}

export function epassBrowseEmptyReason<T extends { reportDate: string }>(
  snapshots: T[] | undefined,
  filters: EpassDateFilterInput,
): EpassBrowseEmptyReason | null {
  if (!isEpassBrowseEmpty(snapshots, filters)) return null;
  if (!snapshots?.length) return 'no-reports';
  return 'date-range';
}

export function epassBrowseEmptyMessage<T extends { reportDate: string }>(
  snapshots: T[] | undefined,
  filters: EpassDateFilterInput,
): string {
  const reason = epassBrowseEmptyReason(snapshots, filters);
  if (reason === 'no-reports') return 'No reports loaded';
  if (reason === 'date-range') return 'No reports for this date range';
  return 'No data available';
}
