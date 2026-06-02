'use client';

import { VehicleStatusMetaBarSkeleton } from '@/components/khanan/skeletons/VehicleStatusMetaBarSkeleton';
import { Card } from '@/components/ui/Card';
import { formatDateDmy } from '@/lib/epass-report-date';
import type { VehicleStatusStatsDto } from '@/lib/epass-types';

interface VehicleStatusMetaBarProps {
  stats: VehicleStatusStatsDto | null;
  isLoading?: boolean;
}

export function VehicleStatusMetaBar({ stats, isLoading = false }: VehicleStatusMetaBarProps) {
  if (isLoading) {
    return <VehicleStatusMetaBarSkeleton />;
  }

  if (!stats || stats.total === 0) {
    return null;
  }

  const lastScraped = stats.lastScrapedAt ? formatDateDmy(new Date(stats.lastScrapedAt)) : '—';

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
        MCV vehicle status
      </p>
      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Total scraped</p>
          <p className="mt-1 font-semibold tabular-nums text-white">
            {stats.total.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Found on portal</p>
          <p className="mt-1 font-semibold tabular-nums text-emerald-300">
            {stats.found.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Not found</p>
          <p className="mt-1 font-semibold tabular-nums text-amber-300">
            {stats.notFound.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Last scraped</p>
          <p className="mt-1 font-semibold text-white">{lastScraped}</p>
        </div>
      </div>
    </Card>
  );
}
