const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse `yyyy-mm-dd` to local calendar date (no time). */
export function parseIsoDate(iso: string): Date | null {
  const m = ISO_DATE_RE.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  return d;
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

/** Portal `txtDate1` / calendar value (`dd-MMM-yyyy`, e.g. `01-Jun-2026`). */
export function isoToPortalDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = PORTAL_MONTH_LABELS[d.getMonth()] ?? 'Jan';
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

const PORTAL_REPORT_DATE_RE = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
const NUMERIC_REPORT_DATE_RE = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

const PORTAL_MONTH_INDEX: Record<string, number> = {
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

/**
 * Parse Khanan export / portal report dates to `yyyy-mm-dd`.
 * Supports ISO, `dd-MMM-yyyy` (e.g. `22-Jun-2019`), and `dd-MM-yyyy`.
 */
export function parsePortalReportDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (ISO_DATE_RE.test(trimmed)) {
    return parseIsoDate(trimmed) ? trimmed : null;
  }

  const portal = PORTAL_REPORT_DATE_RE.exec(trimmed);
  if (portal) {
    const day = Number(portal[1]);
    const monthKey = portal[2].slice(0, 3).toLowerCase();
    const year = Number(portal[3]);
    const month = PORTAL_MONTH_INDEX[monthKey];
    if (month == null) return null;
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
      return null;
    }
    return formatIsoDate(d);
  }

  const numeric = NUMERIC_REPORT_DATE_RE.exec(trimmed);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const year = Number(numeric[3]);
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
      return null;
    }
    return formatIsoDate(d);
  }

  return null;
}

/** Inclusive list of ISO days from `fromIso` through `toIso`. */
export function eachIsoDayInclusive(fromIso: string, toIso: string): string[] {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) {
    throw new Error('Invalid date range');
  }
  if (from > to) {
    throw new Error('from must be on or before to');
  }

  const out: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    out.push(formatIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
