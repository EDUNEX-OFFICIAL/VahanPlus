export function normalizeMineralLabel(value) {
  const source = String(value ?? '').trim();
  if (!source) return null;
  const lower = source.toLowerCase();
  if (lower.includes('yellow')) return 'Sand Yellow';
  if (lower.includes('white')) return 'Sand White';
  const cleaned = source
    .replace(/\bno\s*size\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

export function normalizeConsignerName(value) {
  const source = String(value ?? '').trim();
  if (!source) return '';
  return source.replace(/-\d{5,}$/g, '').trim();
}

export function normalizeDmoKey(dmoName) {
  return String(dmoName ?? '')
    .trim()
    .toLowerCase();
}
