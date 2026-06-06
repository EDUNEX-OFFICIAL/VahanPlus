'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Building2,
  Car,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Layers,
  Truck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardHero, DashboardHeroSkeleton } from '@/components/dashboard/DashboardHero';
import { DashboardKpiToggle } from '@/components/dashboard/DashboardKpiToggle';
import { DashboardLatestSnapshot } from '@/components/dashboard/DashboardLatestSnapshot';
import { DashboardQuickLinks } from '@/components/dashboard/DashboardQuickLinks';
import { DashboardRecentRuns } from '@/components/dashboard/DashboardRecentRuns';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { DASHBOARD_QUERY_KEY, fetchDashboardOverview } from '@/lib/dashboard';
import type { DashboardKpiView } from '@/lib/dashboard-types';
import { buildDashboardKpis } from '@/lib/dashboard-view';

const KPI_ICONS: Record<string, LucideIcon> = {
  'queue-waiting': Clock,
  'queue-active': Activity,
  'jobs-failed': AlertTriangle,
  'jobs-completed': CheckCircle2,
  'district-rows': Building2,
  'consigner-rows': Users,
  'challan-rows': FileText,
  'pass-rows': Layers,
  'mcv-total': Truck,
  'portal-found': CheckCircle2,
  'portal-missing': AlertTriangle,
  'crm-active': Car,
};

export function DashboardPageContent() {
  const [view, setView] = useState<DashboardKpiView>('operations');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboardOverview,
    refetchInterval: 30_000,
  });

  const kpis = useMemo(() => (data ? buildDashboardKpis(data, view) : []), [data, view]);

  if (isLoading) {
    return (
      <PageStack className="space-y-5 lg:space-y-8">
        <DashboardHeroSkeleton />
        <div className="h-10 w-72 max-w-full animate-pulse rounded-xl bg-surface-deep" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </PageStack>
    );
  }

  if (isError || !data) {
    return (
      <PageStack>
        <DataErrorCard
          message={error instanceof Error ? error.message : 'Unable to load dashboard'}
          onRetry={() => refetch()}
        />
      </PageStack>
    );
  }

  return (
    <PageStack className="space-y-5 lg:space-y-8">
      <DashboardHero overview={data} />
      <DashboardKpiToggle value={view} onChange={setView} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 xl:grid-cols-4">
        {kpis.map((metric) => (
          <StatCard key={metric.id} metric={metric} icon={KPI_ICONS[metric.id] ?? Database} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <DashboardLatestSnapshot overview={data} />
        <DashboardRecentRuns overview={data} />
      </div>
      <DashboardQuickLinks />
    </PageStack>
  );
}
