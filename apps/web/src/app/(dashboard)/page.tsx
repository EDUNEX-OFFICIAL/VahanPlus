import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { kpis } from '@/lib/dashboard-data';

export default function DashboardPage() {
  return (
    <div className="animate-slide-right space-y-8">
      <DashboardHero />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}
