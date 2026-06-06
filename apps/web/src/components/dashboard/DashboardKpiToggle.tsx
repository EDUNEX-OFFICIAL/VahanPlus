'use client';

import type { DashboardKpiView } from '@/lib/dashboard-types';
import { cn } from '@/lib/utils';

const VIEWS: { id: DashboardKpiView; label: string }[] = [
  { id: 'operations', label: 'Operations' },
  { id: 'data', label: 'Latest data' },
  { id: 'vehicles', label: 'Vehicles & CRM' },
];

interface Props {
  value: DashboardKpiView;
  onChange: (view: DashboardKpiView) => void;
}

export function DashboardKpiToggle({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl border border-border-default bg-surface-deep/60 p-1"
      role="tablist"
      aria-label="Dashboard metrics"
    >
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={value === view.id}
          onClick={() => onChange(view.id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
            value === view.id
              ? 'bg-surface-primary text-white shadow-sm'
              : 'text-text-secondary hover:bg-surface-primary/60 hover:text-white',
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
