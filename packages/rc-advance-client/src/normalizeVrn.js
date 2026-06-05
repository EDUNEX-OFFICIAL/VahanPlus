/** Normalize vehicle registration for dedup / storage keys. */
export function normalizeVehicleRegNo(raw) {
  if (raw == null) return null;
  const normalized = String(raw).trim().replace(/\s+/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}
