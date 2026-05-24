'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { navItems, type NavGroup } from '@/lib/nav-config';

function groupDefaultOpen(group: NavGroup, pathname: string): boolean {
  if (!group.prefix) return false;
  return pathname === group.prefix || pathname.startsWith(`${group.prefix}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
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
    <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 scrollbar-thin">
      <ul className="space-y-1">
        {navItems.map((item) => {
          if (item.type === 'link') {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-500/15 text-indigo-200'
                      : 'text-text-secondary hover:bg-surface-secondary/60 hover:text-white'
                  }`}
                >
                  {item.label}
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
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-secondary/60 hover:text-white"
              >
                <span>{item.label}</span>
                <span
                  className={`text-xs text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  aria-hidden
                >
                  ›
                </span>
              </button>
              {isOpen && (
                <ul className="mt-1 space-y-0.5 border-l border-border-default/60 ml-3 pl-2">
                  {item.children.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-slate-600">Coming soon</li>
                  ) : (
                    item.children.map((child) => {
                      const active = pathname === child.href;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`block rounded-lg px-3 py-2 text-sm transition ${
                              active
                                ? 'bg-indigo-500/15 font-medium text-indigo-200'
                                : 'text-text-muted hover:bg-surface-secondary/40 hover:text-text-secondary'
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
