'use client';

import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { SidebarNav } from './SidebarNav';

export function Sidebar() {
  const router = useRouter();

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-[272px] flex-col border-r border-border-default bg-surface-primary">
      <div className="shrink-0 border-b border-border-default px-6 py-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white"
            style={{ boxShadow: '0 0 24px rgba(99,102,241,0.55)' }}
          >
            V
          </div>
          <div>
            <p className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-lg font-black tracking-tight text-transparent">
              VAHANPLUS
            </p>
          </div>
        </div>
      </div>
      <SidebarNav />
      <div className="shrink-0 border-t border-border-default px-4 py-4">
        <Button variant="destructive" className="w-full" onClick={logout}>
          Logout
        </Button>
      </div>
    </aside>
  );
}
