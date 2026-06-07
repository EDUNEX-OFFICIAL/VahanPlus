/** CSV list from API query — accepts canonical and legacy param names. */
export function parseCsvQueryParam(query, ...keys) {
  for (const key of keys) {
    const raw = query[key];
    if (typeof raw === 'string' && raw.trim()) {
      return raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
}
