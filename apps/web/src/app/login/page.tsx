'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearSession, fetchSessionUser, login } from '@/lib/api';
import { safeNextPath } from '@/lib/safe-next-path';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AmbientBlobs } from '@/components/shell/AmbientBlobs';

function loginErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Sign in failed. Please try again.';
  const msg = err.message;
  if (msg.includes('Cannot reach API')) return msg;
  if (msg === 'Invalid username or password' || msg.includes('(401)')) {
    return 'Invalid username or password';
  }
  return msg;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('session') === 'expired';
  const nextPath = safeNextPath(searchParams.get('next'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchSessionUser({ redirectOnUnauthenticated: false });
        if (!cancelled) {
          router.replace(nextPath);
        }
      } catch {
        await clearSession();
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, nextPath]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.target as HTMLFormElement);
    const username = String(form.get('username') || '').trim();
    const password = String(form.get('password') || '');
    try {
      await login(username, password);
      router.push(nextPath);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <AmbientBlobs />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <AmbientBlobs />
      <div
        className="animate-fade-up relative z-10 w-full max-w-sm rounded-3xl border border-border-default bg-surface-primary/90 p-8"
        style={{ boxShadow: '0 0 60px rgba(99,102,241,0.1)' }}
      >
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black text-white"
            style={{ boxShadow: '0 0 24px rgba(99,102,241,0.55)' }}
          >
            V
          </div>
          <h1 className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-2xl font-black text-transparent">
            VAHANPLUS
          </h1>
          <p className="mt-2 text-sm text-text-muted">Sign in to continue</p>
        </div>
        <form className="space-y-5" onSubmit={onSubmit}>
          <Input name="username" label="Username" autoComplete="username" required />
          <PasswordInput
            name="password"
            label="Password"
            autoComplete="current-password"
            required
          />
          {sessionExpired && !error ? (
            <Alert type="error">Session expired. Sign in again.</Alert>
          ) : null}
          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center p-6">
          <AmbientBlobs />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
