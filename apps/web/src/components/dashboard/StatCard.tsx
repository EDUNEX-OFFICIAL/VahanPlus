'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { DashboardKpi } from '@/lib/dashboard-types';
import { cn } from '@/lib/utils';

const accentStyles: Record<string, string> = {
  indigo: 'from-indigo-500/20 to-transparent border-indigo-500/30',
  cyan: 'from-cyan-500/20 to-transparent border-cyan-500/30',
  emerald: 'from-emerald-500/20 to-transparent border-emerald-500/30',
  amber: 'from-amber-500/20 to-transparent border-amber-500/30',
  rose: 'from-rose-500/20 to-transparent border-rose-500/30',
};

interface StatCardProps {
  metric: DashboardKpi;
  icon?: LucideIcon;
}

export function StatCard({ metric, icon: Icon }: StatCardProps) {
  const accent = accentStyles[metric.accent || 'indigo'] || accentStyles.indigo;
  const MotionLink = motion.create(Link);

  return (
    <MotionLink
      href={metric.href}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        'group relative flex min-h-[8.5rem] flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-lg shadow-black/20 backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 sm:p-5',
        accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-indigo-200">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[11px]">
            {metric.label}
          </p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-indigo-200 opacity-80 transition group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-auto pt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
        {metric.value}
      </p>
      <p className="mt-2 text-xs leading-snug text-text-secondary">{metric.hint}</p>
    </MotionLink>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="min-h-[8.5rem] animate-pulse rounded-2xl border border-border-default bg-surface-deep p-4 sm:p-5">
      <div className="h-3 w-24 rounded bg-surface-primary" />
      <div className="mt-8 h-9 w-20 rounded bg-surface-primary" />
      <div className="mt-3 h-3 w-32 rounded bg-surface-primary" />
    </div>
  );
}
