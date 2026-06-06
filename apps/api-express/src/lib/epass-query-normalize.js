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
  return trimmed.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Prisma contains filter for consigner names — matches spaced and compact paren forms.
 * DB may store "LTD (Arwal" or "LTD(Arwal".
 *
 * @param {string} normalizedName
 * @returns {{ consignerName: object } | { OR: object[] } | null}
 */
export function consignerNameContainsWhere(normalizedName) {
  const spaced = typeof normalizedName === 'string' ? normalizedName.trim() : '';
  if (!spaced) return null;

  const compact = spaced.replace(/\s+\(/g, '(');
  const variants = [...new Set([spaced, compact].filter(Boolean))];

  if (variants.length === 1) {
    return { consignerName: { contains: variants[0], mode: 'insensitive' } };
  }

  return {
    OR: variants.map((v) => ({
      consignerName: { contains: v, mode: 'insensitive' },
    })),
  };
}

/**
 * @param {Record<string, unknown>} target Prisma where object (consignerRow or consigner where)
 * @param {string} normalizedName
 */
export function applyConsignerNameFilter(target, normalizedName) {
  const clause = consignerNameContainsWhere(normalizedName);
  if (!clause) return;
  if (clause.OR) {
    target.AND = [...(target.AND ?? []), clause];
  } else {
    Object.assign(target, clause);
  }
}
