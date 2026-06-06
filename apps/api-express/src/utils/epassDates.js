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
  const timestamp = Date.parse(source);
  if (!Number.isNaN(timestamp)) return new Date(timestamp);
  return null;
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
