/**
 * Decode keyset cursor: base64url JSON { sortValue, entityKey }.
 * @param {string | undefined} raw
 */
export function decodeCursor(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.entityKey === 'string') return parsed;
  } catch {
    return null;
  }
  return null;
}

export function encodeCursor(sortValue, entityKey) {
  return Buffer.from(JSON.stringify({ sortValue, entityKey }), 'utf8').toString('base64url');
}

/**
 * Legacy offset pagination fallback when cursor not provided.
 */
export function resolvePageParams(query) {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const cursor = decodeCursor(query.cursor);
  return { limit, offset, cursor };
}
