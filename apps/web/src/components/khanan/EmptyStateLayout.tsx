'use client';

import type { LucideIcon } from 'lucide-react';
import { Calendar, Database, Inbox, Upload } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export type EmptyStateIcon = 'database' | 'calendar' | 'inbox' | 'upload';

export type EmptyStateAction = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

const ICONS: Record<EmptyStateIcon, LucideIcon> = {
  database: Database,
  calendar: Calendar,
  inbox: Inbox,
  upload: Upload,
};

const actionVariants = {
  primary:
    'rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-100 ring-1 ring-indigo-500/20 hover:bg-indigo-500/25',
  secondary:
    'rounded-xl border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800',
};

interface EmptyStateLayoutProps {
  message: string;
  icon?: EmptyStateIcon;
  actions?: EmptyStateAction[];
  size?: 'browse' | 'compact';
  className?: string;
}

export function EmptyStateLayout({
  message,
  icon = 'inbox',
  actions,
  size = 'browse',
  className,
}: EmptyStateLayoutProps) {
  const Icon = ICONS[icon];
  const compact = size === 'compact';

  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center border border-dashed border-slate-600/50 bg-slate-900/20 px-6 text-center',
        compact ? 'min-h-[140px] py-8' : 'min-h-[220px] py-10',
        actions?.some((a) => a.variant === 'primary') && !compact && 'ring-1 ring-indigo-500/10',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-xl border border-slate-600/50 bg-slate-800/60',
          compact ? 'h-9 w-9' : 'h-11 w-11',
        )}
        aria-hidden
      >
        <Icon className={cn('text-slate-400', compact ? 'h-4 w-4' : 'h-5 w-5')} />
      </div>
      <p
        className={cn('font-medium text-slate-200', compact ? 'text-sm text-slate-300' : 'text-sm')}
      >
        {message}
      </p>
      {actions && actions.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actions.slice(0, 2).map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={actionVariants[action.variant ?? 'secondary']}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
