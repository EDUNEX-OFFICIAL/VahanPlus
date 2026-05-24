import { clearToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  clearToken();
  const next = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ session: 'expired' });
  if (next && next !== '/login') params.set('next', next);
  window.location.replace(`/login?${params}`);
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };
  if (options?.token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${options.token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${API_URL}. Start api-express (pnpm dev) and ensure Postgres is running on port 5434.`,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { message?: string }).message ||
      (body as { error?: string }).error ||
      `Request failed (${res.status})`;
    if (res.status === 401 && options?.token) {
      redirectToLogin();
      throw new Error('Session expired');
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  return apiFetch<{ token: string; user: { id: string; username: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
