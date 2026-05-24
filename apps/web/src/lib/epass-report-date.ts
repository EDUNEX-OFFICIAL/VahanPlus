const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parse portal report dates like `20-May-2026`. Returns null if unparseable. */
export function parseReportDate(value: string): Date | null {
  const trimmed = value.trim();
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(trimmed);
  if (!m) return null;

  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase()];
  const year = Number(m[3]);
  if (month == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;

  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

export function compareReportDates(a: string, b: string): number {
  const da = parseReportDate(a);
  const db = parseReportDate(b);
  if (da && db) return da.getTime() - db.getTime();
  return a.localeCompare(b);
}

/** ISO date string `yyyy-mm-dd` from report date, or null. */
export function reportDateToIso(value: string): string | null {
  const d = parseReportDate(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse HTML date input value to start-of-day Date. */
export function parseIsoDateInput(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function isReportDateInRange(
  reportDate: string,
  fromIso: string | null,
  toIso: string | null,
): boolean {
  const from = fromIso ? parseIsoDateInput(fromIso) : null;
  const to = toIso ? parseIsoDateInput(toIso) : null;
  if (!from && !to) return true;

  const d = parseReportDate(reportDate);
  if (!d) return false;

  if (from && d < from) return false;
  if (to) {
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

export type EpassDateMode = 'specific' | 'range';

export interface EpassDateFilterInput {
  dateMode: EpassDateMode;
  dateFrom: string;
  dateTo: string;
  snapshotId: string;
}

/** Snapshots whose portal report date falls in the HTML date range (range mode only). */
export function snapshotsForDateMode<T extends { reportDate: string }>(
  snapshots: T[],
  dateMode: EpassDateMode,
  dateFrom: string,
  dateTo: string,
): T[] {
  if (dateMode === 'specific') return snapshots;
  return snapshots.filter((s) => {
    const from = dateFrom || null;
    const to = dateTo || dateFrom || null;
    if (!from && !to) return true;
    return isReportDateInRange(s.reportDate, from, to);
  });
}

/**
 * Snapshot id safe to load for current date filters.
 * Range mode with no in-range reports → null (no fallback to latest).
 */
export function resolveSnapshotIdForDateFilters<T extends { id: string; reportDate: string }>(
  snapshots: T[],
  filters: EpassDateFilterInput,
): string | null {
  if (filters.dateMode === 'range') {
    const inRange = snapshotsForDateMode(
      snapshots,
      filters.dateMode,
      filters.dateFrom,
      filters.dateTo,
    );
    if (inRange.length === 0) return null;
    if (filters.snapshotId && inRange.some((s) => s.id === filters.snapshotId)) {
      return filters.snapshotId;
    }
    return null;
  }

  if (!filters.snapshotId) return null;
  return snapshots.some((s) => s.id === filters.snapshotId) ? filters.snapshotId : null;
}

export function hasActiveDateRangeWithNoSnapshots<T extends { reportDate: string }>(
  snapshots: T[],
  filters: EpassDateFilterInput,
): boolean {
  if (filters.dateMode !== 'range') return false;
  if (!filters.dateFrom && !filters.dateTo) return false;
  return snapshotsForDateMode(snapshots, filters.dateMode, filters.dateFrom, filters.dateTo)
    .length === 0;
}
