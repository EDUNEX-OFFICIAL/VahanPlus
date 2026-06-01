'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useState } from 'react';
import { logout } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { quickNavItems } from '@/lib/nav-config';
import { cn } from '@/lib/utils';
import { NavIconView } from './NavIcon';
import { SidebarNav } from './SidebarNav';

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', compact && 'justify-center')}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-sm font-black text-white ring-1 ring-indigo-400/40"
        style={{ boxShadow: '0 0 24px rgba(99,102,241,0.55)' }}
      >
        V
      </div>
      {!compact ? (
        <div className="min-w-0">
          <p className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-lg font-black tracking-tight text-transparent">
            VAHANPLUS
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  desktopCollapsed,
  onDesktopCollapsedChange,
}: {
  desktopCollapsed: boolean;
  onDesktopCollapsedChange: (collapsed: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 hidden h-dvh flex-col border-r border-border-default/80 bg-surface-primary/88 shadow-2xl shadow-black/30 backdrop-blur-xl transition-[width] duration-300 xl:flex',
          desktopCollapsed ? 'w-[88px]' : 'w-[272px]',
        )}
      >
        <div
          className={cn(
            'shrink-0 border-b border-border-default/70 px-4 py-5',
            desktopCollapsed && 'px-3',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Brand compact={desktopCollapsed} />
            {!desktopCollapsed ? (
              <button
                type="button"
                aria-label="Collapse sidebar"
                onClick={() => onDesktopCollapsedChange(true)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-deep hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
              >
                <PanelLeftClose className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
          {desktopCollapsed ? (
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={() => onDesktopCollapsedChange(false)}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-deep hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <SidebarNav collapsed={desktopCollapsed} />
        <div className="shrink-0 border-t border-border-default/70 px-4 py-4">
          <Button
            variant="destructive"
            className={cn('w-full gap-2', desktopCollapsed && 'px-0')}
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {!desktopCollapsed ? 'Logout' : <span className="sr-only">Logout</span>}
          </Button>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 xl:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[1.5rem] border border-border-default/80 bg-surface-primary/82 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl md:max-w-xl">
          {quickNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70',
                  active
                    ? 'bg-indigo-500/18 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.22)]'
                    : 'text-text-muted hover:text-white',
                )}
              >
                <NavIconView icon={item.icon} className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-label="Open all navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="ml-1 inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-indigo-500/35 bg-indigo-500/18 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.24)]"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[70dvh] flex-col overflow-hidden rounded-[1.75rem] border border-border-default/80 bg-surface-primary/95 shadow-2xl shadow-black/40 backdrop-blur-2xl md:left-6 md:right-auto md:top-6 md:bottom-auto md:h-[calc(100dvh-3rem)] md:max-h-none md:w-[360px] xl:hidden"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b border-border-default/70 px-4 py-4">
                <Brand />
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-deep hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
              <div className="border-t border-border-default/70 p-4">
                <Button variant="destructive" className="w-full gap-2" onClick={onLogout}>
                  <LogOut className="h-4 w-4" aria-hidden />
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
