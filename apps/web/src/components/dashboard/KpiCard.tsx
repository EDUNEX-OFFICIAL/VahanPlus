import type { KpiMetric } from '@/lib/dashboard-data';

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

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 ${accent}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {metric.label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white animate-pulse-glow">
        {metric.value}
      </p>
      <span
        className={`mt-3 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${trend}`}
      >
        {metric.delta}
      </span>
    </div>
  );
}
