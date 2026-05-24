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

/** Portal `txtDate1` value (DD/MM/YYYY). */
export function isoToPortalDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
