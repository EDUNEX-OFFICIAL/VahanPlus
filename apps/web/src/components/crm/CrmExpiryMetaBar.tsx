'use client';

import { Card } from '@/components/ui/Card';
import { formatDateDmy } from '@/lib/epass-report-date';
import type { CrmExpiryStatsDto } from '@/lib/crm-types';

interface CrmExpiryMetaBarProps {
  stats: CrmExpiryStatsDto | null;
  isLoading?: boolean;
}

export function CrmExpiryMetaBar({ stats, isLoading = false }: CrmExpiryMetaBarProps) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-16" aria-hidden />
      </Card>
    );
  }

  if (!stats) return null;

  const lastScraped = stats.lastScrapedAt ? formatDateDmy(new Date(stats.lastScrapedAt)) : '—';

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
        CRM expiry queue
      </p>
      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">In queue</p>
          <p className="mt-1 font-semibold tabular-nums text-white">
            {stats.totalInQueue.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Auto</p>
          <p className="mt-1 font-semibold tabular-nums text-amber-300">
            {stats.autoCount.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Manual</p>
          <p className="mt-1 font-semibold tabular-nums text-emerald-300">
            {stats.manualCount.toLocaleString('en-IN')}
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
