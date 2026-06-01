'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import type { ScraperConfigStatus, ScraperLiveResponse } from '@/lib/scraper-config-types';

const LIVE_SNAPSHOT_LIMIT = 5;

interface Props {
  status: ScraperConfigStatus;
  scrapeActive: boolean;
  live: ScraperLiveResponse | undefined;
  loading?: boolean;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="tabular-nums text-text-secondary">
      <span className="text-xs uppercase tracking-wider">{label}</span>{' '}
      <span className="font-medium text-white">{value.toLocaleString('en-IN')}</span>
    </span>
  );
}

function IdleSummary({ status }: { status: ScraperConfigStatus }) {
  const snap = status.latestSnapshot;
  const stats = status.latestSnapshotStats;
  if (!snap || !stats) return null;

  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
      <span className="font-medium text-white">{snap.reportDate}</span>
      <span className="text-text-secondary">{formatWhen(snap.scrapedAt)}</span>
      <Stat label="District" value={stats.districtRows} />
      <Stat label="Consigner" value={stats.consignerRows} />
      <Stat label="Challan" value={stats.challanRows} />
      <Stat label="Pass" value={stats.passRows} />
    </div>
  );
}

function LiveDetail({ live }: { live: ScraperLiveResponse }) {
  const recentSnapshots = useMemo(
    () => live.snapshots.slice(0, LIVE_SNAPSHOT_LIMIT),
    [live.snapshots],
  );

  const grouped = useMemo(() => {
    if (!recentSnapshots.length) return [];
    const byDate = new Map<string, typeof recentSnapshots>();
    for (const row of recentSnapshots) {
      const list = byDate.get(row.reportDate) ?? [];
      list.push(row);
      byDate.set(row.reportDate, list);
    }
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [recentSnapshots]);

  return (
    <>
      {grouped.length > 0 ? (
        <>
          <div className="mt-6 space-y-4 md:hidden">
            {grouped.map(([reportDate, rows]) => (
              <MobileDataCard key={reportDate} eyebrow="Report date" title={reportDate}>
                {rows.map((row) => (
                  <div key={row.id} className="mt-3 border-t border-border-default/60 pt-3">
                    <p className="text-xs text-text-secondary">
                      Scraped {formatWhen(row.scrapedAt)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <DataField label="District" value={String(row.districtRows)} />
                      <DataField label="Consigner" value={String(row.consignerRows)} />
                      <DataField label="Challan" value={String(row.challanRows)} />
                      <DataField label="Pass" value={String(row.passRows)} />
                    </div>
                  </div>
                ))}
              </MobileDataCard>
            ))}
          </div>

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
                  <th className="px-3 py-2 font-semibold">Report date</th>
                  <th className="px-3 py-2 font-semibold">Scraped at</th>
                  <th className="px-3 py-2 font-semibold text-right">District</th>
                  <th className="px-3 py-2 font-semibold text-right">Consigner</th>
                  <th className="px-3 py-2 font-semibold text-right">Challan</th>
                  <th className="px-3 py-2 font-semibold text-right">Pass</th>
                </tr>
              </thead>
              <tbody>
                {grouped.flatMap(([reportDate, rows]) =>
                  rows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-border-default/50">
                      <td className="px-3 py-3 font-medium text-white">
                        {idx === 0 ? reportDate : ''}
                      </td>
                      <td className="px-3 py-3 text-text-secondary">{formatWhen(row.scrapedAt)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.districtRows}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.consignerRows}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.challanRows}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.passRows}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-text-secondary">Waiting for report rows…</p>
      )}
    </>
  );
}

export function KhananConfigLiveScrape({ status, scrapeActive, live, loading }: Props) {
  const hasHistory = Boolean(status.latestSnapshot && status.latestSnapshotStats);

  if (!scrapeActive && !hasHistory) {
    return (
      <Card>
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Last scrape
        </h3>
        <div className="mt-4">
          <EmptyStateCard message="No scrape data yet" />
        </div>
      </Card>
    );
  }

  if (!scrapeActive) {
    return (
      <Card>
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Last scrape
        </h3>
        <IdleSummary status={status} />
      </Card>
    );
  }

  if (loading && !live) {
    return (
      <Card className="animate-pulse p-12">
        <div className="h-32 rounded bg-surface-deep" />
      </Card>
    );
  }

  const showLive = live && live.snapshots.length > 0;

  return (
    <Card className="border-emerald-500/20">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Live scrape
        </h3>
        <Chip tone="emerald">Running</Chip>
      </div>
      {showLive && live ? (
        <LiveDetail live={live} />
      ) : (
        <p className="mt-4 text-sm text-text-secondary">Starting…</p>
      )}
    </Card>
  );
}
