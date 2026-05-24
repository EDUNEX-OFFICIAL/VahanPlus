/** Default date for district scrape UI (`yyyy-mm-dd`). */
export function defaultDistrictDateInput(
  configDefault: string | null | undefined,
  timeZone = 'Asia/Kolkata',
): string {
  if (configDefault) return configDefault;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function countIsoDaysInclusive(from: string, to: string): number | null {
  const parse = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const a = parse(from);
  const b = parse(to);
  if (!a || !b || a > b) return null;
  let n = 0;
  const cur = new Date(a);
  while (cur <= b) {
    n += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}
