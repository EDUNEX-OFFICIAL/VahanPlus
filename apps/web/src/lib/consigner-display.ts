export function appendGhatSuffix(label: string, ghatNumber: string | null | undefined): string {
  const g = ghatNumber?.trim();
  return g ? `${label} · ${g}` : label;
}
