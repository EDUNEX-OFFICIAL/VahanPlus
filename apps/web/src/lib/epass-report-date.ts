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

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const FULL_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

export function formatDateDmy(value: Date): string {
  const day = String(value.getDate()).padStart(2, '0');
  const month = MONTH_LABELS[value.getMonth()] ?? 'Jan';
  const year = value.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Display report date as `DD-MM-YYYY` (tables, chips). */
export function formatReportDateNumeric(value: string): string {
  const d = parseReportDateFlexible(value);
  if (!d) return value.trim() || '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

/** Display report date as `DD-MMMM-YYYY` (dropdown labels, meta bar). */
export function formatReportDateLong(value: string): string {
  const d = parseReportDateFlexible(value);
  if (!d) return value.trim() || '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = FULL_MONTH_LABELS[d.getMonth()] ?? '';
  return `${day}-${month}-${d.getFullYear()}`;
}

export function normalizeReportDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '—';
  const d = parseReportDateFlexible(trimmed);
  if (d) return formatReportDateNumeric(trimmed);
  return trimmed;
}

function parseNumericDmy(value: string): Date | null {
  const dash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value);
  if (dash) {
    const day = Number(dash[1]);
    const month = Number(dash[2]) - 1;
    const year = Number(dash[3]);
    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day) {
      return parsed;
    }
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    const year = Number(slash[3]);
    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day) {
      return parsed;
    }
  }
  return null;
}

export function compareReportDates(a: string, b: string): number {
  const da = parseReportDateFlexible(a);
  const db = parseReportDateFlexible(b);
  if (da && db) return da.getTime() - db.getTime();
  return a.localeCompare(b);
}

/** Best-effort parse of portal/stored report date strings into a local calendar date. */
export function parseReportDateFlexible(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const portal = parseReportDate(trimmed);
  if (portal) return portal;

  const dmy = parseNumericDmy(trimmed);
  if (dmy) return dmy;

  const iso = parseIsoDateInput(trimmed);
  if (iso) return iso;

  const timestamp = Date.parse(trimmed);
  if (!Number.isNaN(timestamp)) return new Date(timestamp);

  return null;
}

/** Start of local calendar day (ms) for lag comparisons. */
export function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** ISO date string `yyyy-mm-dd` from report date, or null. */
export function reportDateToIso(value: string): string | null {
  const d = parseReportDateFlexible(value);
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

export function normalizeDateRange(from: string, to: string): { dateFrom: string; dateTo: string } {
  const dateFrom = from.trim();
  const dateTo = (to || from).trim();
  if (!dateFrom || !dateTo) {
    return { dateFrom, dateTo };
  }
  const fromDate = parseIsoDateInput(dateFrom);
  const toDate = parseIsoDateInput(dateTo);
  if (fromDate && toDate && fromDate > toDate) {
    return { dateFrom: dateTo, dateTo: dateFrom };
  }
  return { dateFrom, dateTo };
}

export function isValidRangeSelection(
  dateMode: EpassDateMode,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (dateMode !== 'range') return true;
  return Boolean(dateFrom.trim() || dateTo.trim());
}

export function isReportDateInRange(
  reportDate: string,
  fromIso: string | null,
  toIso: string | null,
): boolean {
  const from = fromIso ? parseIsoDateInput(fromIso) : null;
  const to = toIso ? parseIsoDateInput(toIso) : null;
  if (!from && !to) return true;

  const d = parseReportDateFlexible(reportDate);
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

export interface EpassSnapshotDatePick {
  id: string;
  reportDate: string;
  scrapedAt: string;
}

/** One option per report date (latest scrapedAt wins when duplicates exist). */
export function reportDateOptions(snapshots: EpassSnapshotDatePick[]): ReportDateOption[] {
  const byDate = new Map<string, EpassSnapshotDatePick>();
  for (const s of snapshots) {
    const existing = byDate.get(s.reportDate);
    if (!existing || new Date(s.scrapedAt) > new Date(existing.scrapedAt)) {
      byDate.set(s.reportDate, s);
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => compareReportDates(b[0], a[0]))
    .map(([reportDate, snap]) => ({ reportDate, snapshotId: snap.id }));
}

export interface ReportDateOption {
  reportDate: string;
  snapshotId: string;
}

export interface ReportDateYearGroup {
  year: number;
  options: ReportDateOption[];
}

/** Calendar year from a stored/portal report date string. */
export function reportDateYear(value: string): number | null {
  const d = parseReportDateFlexible(value);
  return d?.getFullYear() ?? null;
}

/** Group flat report-date options by year (years desc, dates desc within each year). */
export function groupReportDateOptionsByYear(options: ReportDateOption[]): ReportDateYearGroup[] {
  const byYear = new Map<number, ReportDateOption[]>();
  for (const opt of options) {
    const year = reportDateYear(opt.reportDate);
    if (year == null) continue;
    const list = byYear.get(year);
    if (list) list.push(opt);
    else byYear.set(year, [opt]);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, yearOptions]) => ({
      year,
      options: [...yearOptions].sort((a, b) => compareReportDates(b.reportDate, a.reportDate)),
    }));
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
  return (
    snapshotsForDateMode(snapshots, filters.dateMode, filters.dateFrom, filters.dateTo).length === 0
  );
}
