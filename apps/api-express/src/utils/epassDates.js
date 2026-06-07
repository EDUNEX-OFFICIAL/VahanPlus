const REPORT_MONTHS = {
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

export function compareReportDates(a, b) {
  const da = parseReportDate(a);
  const db = parseReportDate(b);
  if (da && db) return da.getTime() - db.getTime();
  return String(a).localeCompare(String(b));
}

export function parseReportDate(value) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(value).trim());
  if (!m) return null;
  const month = REPORT_MONTHS[m[2].toLowerCase()];
  const day = Number(m[1]);
  const year = Number(m[3]);
  if (month == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

export function parseDateFlexible(value) {
  const source = String(value ?? '').trim();
  if (!source) return null;
  const report = parseReportDate(source);
  if (report) return report;
  const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(source);
  if (dmyDash) {
    const day = Number(dmyDash[1]);
    const month = Number(dmyDash[2]) - 1;
    const year = Number(dmyDash[3]);
    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day) {
      return parsed;
    }
  }
  const dmySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(source);
  if (dmySlash) {
    const day = Number(dmySlash[1]);
    const month = Number(dmySlash[2]) - 1;
    const year = Number(dmySlash[3]);
    const parsed = new Date(year, month, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day) {
      return parsed;
    }
  }
  const iso = parseIsoDateInput(source);
  if (iso) return iso;
  const timestamp = Date.parse(source);
  if (!Number.isNaN(timestamp)) return new Date(timestamp);
  return null;
}

const PORTAL_MONTH_LABELS = [
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

function parseIsoDateInput(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Portal report date string `DD-Mon-YYYY` from a Date. */
export function formatPortalReportDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${String(date.getDate()).padStart(2, '0')}-${PORTAL_MONTH_LABELS[date.getMonth()]}-${date.getFullYear()}`;
}

function formatNumericReportDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function formatIsoReportDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isReportDateInRange(reportDate, fromIso, toIso) {
  const from = fromIso ? parseIsoDateInput(fromIso) : null;
  const to = toIso ? parseIsoDateInput(toIso) : null;
  if (!from && !to) return true;
  const d = parseDateFlexible(reportDate);
  if (!d) return false;
  if (from && d < from) return false;
  if (to) {
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

/**
 * All portal report-date strings between ISO bounds (inclusive).
 * Returns null when neither bound is set (caller should load all snapshots).
 */
export function portalReportDatesInIsoRange(fromIso, toIso) {
  const from = fromIso ? parseIsoDateInput(fromIso) : null;
  const to = toIso ? parseIsoDateInput(toIso) : null;
  if (!from && !to) return null;

  const start = from ?? to;
  const end = to ?? from;
  if (!start || !end) return [];

  const rangeStart = start <= end ? start : end;
  const rangeEnd = start <= end ? end : start;
  const dates = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

  while (cursor <= last) {
    const label = formatPortalReportDate(cursor);
    if (label) dates.push(label);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * DB lookup strings for each day in an ISO range — portal, numeric, and ISO formats.
 * Snapshots may store reportDate as scrape (`05-Jun-2026`), import (`2026-04-01`), etc.
 */
export function reportDateLookupVariantsInIsoRange(fromIso, toIso) {
  const from = fromIso ? parseIsoDateInput(fromIso) : null;
  const to = toIso ? parseIsoDateInput(toIso) : null;
  if (!from && !to) return null;

  const start = from ?? to;
  const end = to ?? from;
  if (!start || !end) return [];

  const rangeStart = start <= end ? start : end;
  const rangeEnd = start <= end ? end : start;
  const variants = new Set();
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

  while (cursor <= last) {
    const portal = formatPortalReportDate(cursor);
    const numeric = formatNumericReportDate(cursor);
    const iso = formatIsoReportDate(cursor);
    if (portal) variants.add(portal);
    if (numeric) variants.add(numeric);
    if (iso) variants.add(iso);
    cursor.setDate(cursor.getDate() + 1);
  }

  return [...variants];
}

/** Canonical YYYY-MM-DD for dedup keys (empty string when unparseable). */
export function canonicalTransportDate(value) {
  const parsed = parseDateFlexible(value);
  if (!parsed) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysLeftFromDate(value) {
  const parsed = parseDateFlexible(value);
  if (!parsed) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.ceil((target.getTime() - start.getTime()) / 86400000);
}
