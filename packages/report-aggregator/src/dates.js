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
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const month = REPORT_MONTHS[m[2].toLowerCase()];
  const day = Number(m[1]);
  const year = Number(m[3]);
  if (month == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

/** @returns {number} negative if a<b, positive if a>b, 0 if equal */
export function compareReportDates(a, b) {
  const da = parseReportDate(a);
  const db = parseReportDate(b);
  if (da && db) return da.getTime() - db.getTime();
  return String(a ?? '').localeCompare(String(b ?? ''));
}
