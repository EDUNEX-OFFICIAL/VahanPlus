/** Match API `normalizeConsigneeFilterQuery` for client-side filter chips/links. */
export function normalizeConsigneeFilterQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withoutId = trimmed.replace(/\s*\|\s*\([^)]*\)\s*$/i, '').trim();
  return withoutId || trimmed;
}
