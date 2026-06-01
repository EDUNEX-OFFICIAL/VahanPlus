import { safeNextPath } from '@/lib/safe-next-path';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

type ApiFetchOptions = RequestInit & {
  /** When false, 401 does not clear session or navigate (e.g. login page probe). Default true. */
  redirectOnUnauthenticated?: boolean;
};

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const next = safeNextPath(`${window.location.pathname}${window.location.search}`);
  const params = new URLSearchParams({ session: 'expired' });
  if (next !== '/') params.set('next', next);
  window.location.replace(`/login?${params}`);
}

export async function clearSession(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best-effort cookie clear
  }
}

export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const { redirectOnUnauthenticated = true, ...fetchOptions } = options ?? {};
  const hasBody = fetchOptions.body != null;
  const method = (fetchOptions.method ?? 'GET').toUpperCase();

  const headers: HeadersInit = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(fetchOptions.headers || {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      method,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${API_URL}. Start api-express (pnpm dev) and ensure Postgres is running on port 5434.`,
    );
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      if (redirectOnUnauthenticated) {
        await clearSession();
        redirectToLogin();
      }
      throw new Error('Session expired');
    }
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { message?: string }).message ||
      (body as { error?: string }).error ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  return apiFetch<{ user: { id: string; username: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    redirectOnUnauthenticated: false,
  });
}

export async function fetchSessionUser(options?: { redirectOnUnauthenticated?: boolean }) {
  return apiFetch<{ user: { id: string; username: string } }>('/auth/me', options);
}
