'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { KpiMetric } from '@/lib/dashboard-data';
import { cn } from '@/lib/utils';

const accentStyles: Record<string, string> = {
  indigo: 'from-indigo-500/20 to-transparent border-indigo-500/30',
  cyan: 'from-cyan-500/20 to-transparent border-cyan-500/30',
  lime: 'from-lime-500/20 to-transparent border-lime-500/30',
  rose: 'from-rose-500/20 to-transparent border-rose-500/30',
};

const trendColors = {
  up: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  down: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  neutral: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const accent = accentStyles[metric.accent || 'indigo'] || accentStyles.indigo;
  const trend =
    metric.trend === 'down' && metric.id === 'failed'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : metric.trend === 'up'
        ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
        : trendColors.neutral;

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
        'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-lg shadow-black/20 backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 sm:p-5 lg:p-6',
        accent,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted sm:text-[11px]">
          {metric.label}
        </p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-indigo-200 opacity-80 transition group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-white animate-pulse-glow sm:text-4xl">
        {metric.value}
      </p>
      <span
        className={`mt-3 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${trend}`}
      >
        {metric.delta}
      </span>
    </MotionLink>
  );
}
