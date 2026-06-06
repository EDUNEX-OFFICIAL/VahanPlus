import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { auditLiveScrapeDates } from '@/lib/live-scrape-date-audit';
import type { DashboardOverview } from '@/lib/dashboard-types';

function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}

interface Props {
  overview: DashboardOverview;
}

export function DashboardLatestSnapshot({ overview }: Props) {
  const snap = overview.latestSnapshot;
  const stats = overview.latestSnapshotStats;
  if (!snap || !stats) {
    return (
      <Card>
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Latest snapshot
        </h3>
        <p className="mt-3 text-sm text-text-secondary">No scrape data yet.</p>
      </Card>
    );
  }

  const audit = auditLiveScrapeDates(snap.reportDate, snap.scrapedAt);
  const href = `/khanan/district?snapshotId=${encodeURIComponent(snap.id)}&reportDate=${encodeURIComponent(snap.reportDate)}`;
  const source = snap.sourceUrl === 'import' ? 'Import' : 'Scrape';

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Latest snapshot
          </h3>
          <p className="mt-1 text-base font-bold text-white">{audit.reportDateDisplay}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {audit.scrapedAtDisplay} · {source}
          </p>
        </div>
        <Link href={href} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">
          Open district
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['District', stats.districtRows],
            ['Consigner', stats.consignerRows],
            ['Challan', stats.challanRows],
            ['Pass', stats.passRows],
          ] as const
        ).map(([label, count]) => (
          <div
            key={label}
            className="rounded-xl border border-border-default bg-surface-deep/60 px-3 py-2"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {label}
            </dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-white">{formatCount(count)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
