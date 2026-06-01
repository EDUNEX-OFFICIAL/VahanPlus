import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { kpis } from '@/lib/dashboard-data';

export default function DashboardPage() {
  return (
    <PageStack className="space-y-5 lg:space-y-8">
      <DashboardHero />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 xl:grid-cols-4">
        {kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>
    </PageStack>
  );
}
