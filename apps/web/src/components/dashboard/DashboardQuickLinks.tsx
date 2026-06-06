import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { quickNavItems } from '@/lib/nav-config';

export function DashboardQuickLinks() {
  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
        Quick links
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {quickNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-border-default bg-surface-deep px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-indigo-500/40 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/khanan/config"
          className="rounded-xl border border-border-default bg-surface-deep px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-indigo-500/40 hover:text-white"
        >
          Config
        </Link>
        <Link
          href="/crm/vehicle-expiry"
          className="rounded-xl border border-border-default bg-surface-deep px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-indigo-500/40 hover:text-white"
        >
          CRM expiry
        </Link>
      </div>
    </Card>
  );
}
