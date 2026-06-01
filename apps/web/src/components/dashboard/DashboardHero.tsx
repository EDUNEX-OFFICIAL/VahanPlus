import { Card } from '@/components/ui/Card';

export function DashboardHero() {
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
          Vehicle & Khanan ingest control plane — live metrics at a glance.
        </p>
      </div>
    </Card>
  );
}
