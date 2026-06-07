'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useEpassRoutePrefetch } from '@/hooks/useEpassNavPrefetch';
import { navItems, type NavGroup } from '@/lib/nav-config';
import { cn } from '@/lib/utils';
import { NavIconView } from './NavIcon';

function groupDefaultOpen(group: NavGroup, pathname: string): boolean {
  if (!group.prefix) return false;
  return pathname === group.prefix || pathname.startsWith(`${group.prefix}/`);
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const prefetchRoute = useEpassRoutePrefetch();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of navItems) {
      if (item.type === 'group') {
        next[item.label] = groupDefaultOpen(item, pathname);
      }
    }
    setOpenGroups((prev) => ({ ...next, ...prev }));
  }, [pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <nav
      className={cn(
        'min-h-0 flex-1 overflow-y-auto py-4 scrollbar-thin',
        collapsed ? 'px-2' : 'px-3',
      )}
    >
      <ul className="space-y-1">
        {navItems.map((item) => {
          if (item.type === 'link') {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70',
                    active
                      ? 'bg-indigo-500/15 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.16)]'
                      : 'text-text-secondary hover:bg-surface-secondary/70 hover:text-white',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <NavIconView icon={item.icon} className="h-4 w-4 shrink-0" />
                  {!collapsed ? (
                    <span>{item.label}</span>
                  ) : (
                    <span className="sr-only">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          }

          const isOpen = openGroups[item.label] ?? groupDefaultOpen(item, pathname);

          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-secondary/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70',
                  collapsed ? 'justify-center px-0' : 'justify-between',
                )}
              >
                <span className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
                  <NavIconView icon={item.icon} className="h-4 w-4 shrink-0" />
                  {!collapsed ? (
                    <span>{item.label}</span>
                  ) : (
                    <span className="sr-only">{item.label}</span>
                  )}
                </span>
                {!collapsed ? (
                  <span
                    className={`text-xs text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    aria-hidden
                  >
                    ›
                  </span>
                ) : null}
              </button>
              {isOpen && !collapsed && (
                <ul className="mt-1 ml-3 space-y-0.5 border-l border-border-default/60 pl-2">
                  {item.children.length === 0
                    ? null
                    : item.children.map((child) => {
                        const active = pathname === child.href;
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              onMouseEnter={() => prefetchRoute(child.href)}
                              className={cn(
                                'flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70',
                                active
                                  ? 'bg-indigo-500/15 font-semibold text-indigo-200'
                                  : 'text-text-muted hover:bg-surface-secondary/50 hover:text-text-secondary',
                              )}
                            >
                              <NavIconView icon={child.icon} className="h-4 w-4 shrink-0" />
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
