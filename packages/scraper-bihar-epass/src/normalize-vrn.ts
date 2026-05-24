/** Normalize vehicle registration for dedup / storage keys. */
export function normalizeVehicleRegNo(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const normalized = raw.trim().replace(/\s+/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}
