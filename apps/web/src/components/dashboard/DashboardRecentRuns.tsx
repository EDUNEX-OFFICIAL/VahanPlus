import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { auditLiveScrapeDates } from '@/lib/live-scrape-date-audit';
import type { DashboardOverview } from '@/lib/dashboard-types';

function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}

interface Props {
  overview: DashboardOverview;
}

export function DashboardRecentRuns({ overview }: Props) {
  const rows = overview.recentSnapshots;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Recent scrape runs
        </h3>
        <Link
          href="/khanan/config"
          className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
        >
          Khanan config
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">No runs yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-[11px] uppercase text-text-secondary">
                <th className="pb-2 pr-3">Report date</th>
                <th className="pb-2 pr-3">Scraped at</th>
                <th className="pb-2 pr-3 text-right">Pass</th>
                <th className="pb-2">View</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const audit = auditLiveScrapeDates(row.reportDate, row.scrapedAt);
                const href = `/khanan/district?snapshotId=${encodeURIComponent(row.id)}&reportDate=${encodeURIComponent(row.reportDate)}`;
                return (
                  <tr key={row.id} className="border-b border-slate-800/50">
                    <td className="py-2 pr-3 text-white">
                      <span className="inline-flex items-center gap-1.5">
                        {audit.reportDateDisplay}
                        {row.snapshotCountForDate > 1 ? (
                          <Chip tone="default" className="px-1.5 py-0 text-[10px]">
                            ×{row.snapshotCountForDate}
                          </Chip>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-text-secondary">
                      {audit.scrapedAtDisplay}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">
                      {formatCount(row.passRows)}
                    </td>
                    <td className="py-2">
                      <Link
                        href={href}
                        className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
