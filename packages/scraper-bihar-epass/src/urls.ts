export const PORTAL_BASE = 'https://khanansoft.bihar.gov.in/portal/CitizenRpt/';

export function resolvePortalUrl(href: string | undefined): string | null {
  if (!href || href === '#' || href.trim() === '') return null;
  const trimmed = href.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://khanansoft.bihar.gov.in${trimmed}`;
  }
  return `${PORTAL_BASE}${trimmed.replace(/^\.\//, '')}`;
}

export function isActiveLink(href: string | undefined, $a?: { attr: (n: string) => string | undefined }): boolean {
  if (!href || href === '#') return false;
  if ($a?.attr('disabled') !== undefined) return false;
  return true;
}
