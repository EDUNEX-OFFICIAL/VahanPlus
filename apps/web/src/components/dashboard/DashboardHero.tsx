import { Card } from '@/components/ui/Card';

export function DashboardHero() {
  return (
    <Card hero className="w-full">
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Vahan360</p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Operations overview</h2>
        <p className="mt-2 max-w-xl text-sm text-text-secondary">
          Vehicle & Khanan ingest control plane — live metrics at a glance.
        </p>
      </div>
    </Card>
  );
}
