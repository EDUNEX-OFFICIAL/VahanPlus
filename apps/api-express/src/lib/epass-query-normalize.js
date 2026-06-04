/**
 * Normalize epass browse filter strings so UI labels match portal/DB naming.
 */

/** @param {unknown} raw */
export function normalizeConsigneeFilterQuery(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return '';
  // Summary rows: "MS RUHI ENTERPRISES | (0232790301)" — pass rows omit the id suffix.
  const withoutId = trimmed.replace(/\s*\|\s*\([^)]*\)\s*$/i, '').trim();
  return withoutId || trimmed;
}

/** @param {unknown} raw */
export function normalizeConsignerFilterQuery(raw) {
  let trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return '';
  // Dropdown labels: "ARWAL - lessee - BANSHIDHAR …" — keep only the portal consigner segment.
  const roleMatch = trimmed.match(/\s+-\s*(?:lessee|dealer)\s+-\s+/i);
  if (roleMatch && roleMatch.index != null) {
    trimmed = trimmed.slice(roleMatch.index + roleMatch[0].length).trim();
  }
  // Trailing "(65)" row count from consigner options UI.
  trimmed = trimmed.replace(/\s+\(\d+\)\s*$/, '').trim();
  // Portal compact names: "LTD(Arwal" vs UI "LTD (Arwal".
  return trimmed
    .replace(/\s+\(/g, '(')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
