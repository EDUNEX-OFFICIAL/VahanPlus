import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import type { DashboardOverview } from '@/lib/dashboard-types';
import { dashboardLatestReportLabel, dashboardQueueStateLabel } from '@/lib/dashboard-view';

interface Props {
  overview: DashboardOverview;
}

export function DashboardHero({ overview }: Props) {
  const queueLabel = dashboardQueueStateLabel(overview);
  const reportLabel = dashboardLatestReportLabel(overview);
  const queueTone = overview.queue.isPaused
    ? 'amber'
    : (overview.queue.active ?? 0) + (overview.queue.waiting ?? 0) > 0
      ? 'emerald'
      : 'default';

  return (
    <Card hero className="w-full">
      <div className="relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400 sm:text-xs">
          VahanPlus
        </p>
        <h2 className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-white sm:text-4xl xl:text-5xl">
          Operations overview
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary sm:text-base">
          Live Khanan scrape queue, latest snapshot volumes, and vehicle intelligence.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone={queueTone}>{queueLabel}</Chip>
          {reportLabel ? <Chip tone="indigo">{reportLabel}</Chip> : null}
        </div>
      </div>
    </Card>
  );
}

export function DashboardHeroSkeleton() {
  return (
    <Card hero className="w-full">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-surface-deep" />
        <div className="h-10 w-64 max-w-full rounded bg-surface-deep" />
        <div className="h-4 w-80 max-w-full rounded bg-surface-deep" />
        <div className="flex gap-2 pt-2">
          <div className="h-7 w-28 rounded-full bg-surface-deep" />
          <div className="h-7 w-36 rounded-full bg-surface-deep" />
        </div>
      </div>
    </Card>
  );
}
