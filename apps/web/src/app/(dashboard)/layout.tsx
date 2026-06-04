'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KhananImportJobProvider } from '@/components/khanan/import/KhananImportJobProvider';
import { AppShell } from '@/components/shell/AppShell';
import { AuthChecking } from '@/components/shell/AuthChecking';
import { clearSession, fetchSessionUser } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchSessionUser({ redirectOnUnauthenticated: false });
        if (!cancelled) setAuthed(true);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'Session expired') {
          await clearSession();
          router.replace('/login?session=expired');
          return;
        }
        await clearSession();
        router.replace('/login');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !authed) {
    return <AuthChecking />;
  }

  return (
    <KhananImportJobProvider>
      <AppShell>{children}</AppShell>
    </KhananImportJobProvider>
  );
}
