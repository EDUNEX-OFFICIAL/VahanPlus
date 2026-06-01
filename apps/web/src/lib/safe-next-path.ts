/**
 * Allow only same-origin relative paths (blocks `//evil.com` and `/login` loops).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  const pathOnly = next.split('?')[0]?.split('#')[0] ?? next;
  if (pathOnly === '/login' || pathOnly.startsWith('/login/')) {
    return fallback;
  }
  return next;
}
