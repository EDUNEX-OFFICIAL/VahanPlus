'use client';

import { Activity, Calendar, Clock, Inbox, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { auditLiveScrapeDates, type LiveScrapeDateAudit } from '@/lib/live-scrape-date-audit';
import type {
  LiveSnapshotRow,
  ScraperConfigStatus,
  ScraperLiveResponse,
} from '@/lib/scraper-config-types';
import { cn } from '@/lib/utils';

const LIVE_SNAPSHOT_LIMIT = 5;

interface Props {
  status: ScraperConfigStatus;
  scrapeActive: boolean;
  live: ScraperLiveResponse | undefined;
  loading?: boolean;
}

type AuditedRow = LiveSnapshotRow & { dateAudit: LiveScrapeDateAudit };

interface MetricTotals {
  district: number;
  consigner: number;
  challan: number;
  pass: number;
}

function withDateAudit(rows: LiveSnapshotRow[]): AuditedRow[] {
  return rows.map((row) => ({
    ...row,
    dateAudit: auditLiveScrapeDates(row.reportDate, row.scrapedAt),
  }));
}

function sumTotals(rows: AuditedRow[]): MetricTotals {
  return rows.reduce(
    (acc, row) => ({
      district: acc.district + row.districtRows,
      consigner: acc.consigner + row.consignerRows,
      challan: acc.challan + row.challanRows,
      pass: acc.pass + row.passRows,
    }),
    { district: 0, consigner: 0, challan: 0, pass: 0 },
  );
}

function accentClass(status: LiveScrapeDateAudit['status']): string {
  if (status === 'mismatch') return 'border-l-amber-400/90';
  if (status === 'missing' || status === 'unparseable') return 'border-l-red-400/90';
  return 'border-l-emerald-500/50';
}

function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}

function SectionHeader({
  title,
  subtitle,
  live,
}: {
  title: string;
  subtitle?: string;
  live?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {live ? (
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold text-emerald-200">Live</span>
        </div>
      ) : null}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  const highlight = value > 0;
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 text-center',
        highlight
          ? 'border-indigo-500/25 bg-indigo-500/8'
          : 'border-border-default/60 bg-surface-deep/40',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums leading-none',
          highlight ? 'text-white' : 'text-slate-500',
        )}
      >
        {formatCount(value)}
      </p>
    </div>
  );
}

function MetricsGrid({ totals }: { totals: MetricTotals }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      <MetricPill label="District" value={totals.district} />
      <MetricPill label="Consigner" value={totals.consigner} />
      <MetricPill label="Challan" value={totals.challan} />
      <MetricPill label="Pass" value={totals.pass} />
    </div>
  );
}

function ActivityRow({ row }: { row: AuditedRow }) {
  const { dateAudit } = row;
  const tooltip = [dateAudit.reportDateRaw, dateAudit.detail].filter(Boolean).join(' · ');
  const hasActivity =
    row.districtRows > 0 || row.consignerRows > 0 || row.challanRows > 0 || row.passRows > 0;

  return (
    <article
      className={cn(
        'rounded-xl border border-border-default/50 border-l-[3px] bg-surface-deep/35 p-3.5 sm:p-4',
        accentClass(dateAudit.status),
        !hasActivity && 'opacity-80',
      )}
      title={tooltip || undefined}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-white">
            <Calendar className="h-4 w-4 shrink-0 text-indigo-400/90" aria-hidden />
            <p className="truncate font-semibold">{dateAudit.reportDateDisplay}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <time dateTime={row.scrapedAt}>{dateAudit.scrapedAtDisplay}</time>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-4 gap-1.5 sm:gap-2 sm:text-right">
          {(
            [
              ['Dist.', row.districtRows],
              ['Cons.', row.consignerRows],
              ['Ch.', row.challanRows],
              ['Pass', row.passRows],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg bg-black/20 px-2 py-1.5 sm:min-w-[3.25rem]">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  value > 0 ? 'text-white' : 'text-slate-600',
                )}
              >
                {formatCount(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ReportDateGroup({ reportDate, rows }: { reportDate: string; rows: AuditedRow[] }) {
  const groupTotals = sumTotals(rows);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
          {reportDate}
        </p>
        <p className="text-xs tabular-nums text-text-secondary">
          {rows.length} {rows.length === 1 ? 'update' : 'updates'}
        </p>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <ActivityRow key={row.id} row={row} />
        ))}
      </div>
      {rows.length > 1 ? (
        <div className="rounded-lg border border-dashed border-border-default/40 px-3 py-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            Group total
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ['District', groupTotals.district],
                ['Consigner', groupTotals.consigner],
                ['Challan', groupTotals.challan],
                ['Pass', groupTotals.pass],
              ] as const
            ).map(([label, value]) => (
              <p key={label} className="text-xs text-text-secondary">
                <span className="block text-[10px] uppercase tracking-wide">{label}</span>
                <span className="font-semibold tabular-nums text-white">{formatCount(value)}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function IdleSummary({ status }: { status: ScraperConfigStatus }) {
  const snap = status.latestSnapshot;
  const stats = status.latestSnapshotStats;
  if (!snap || !stats) return null;

  const audit = auditLiveScrapeDates(snap.reportDate, snap.scrapedAt);
  const totals: MetricTotals = {
    district: stats.districtRows,
    consigner: stats.consignerRows,
    challan: stats.challanRows,
    pass: stats.passRows,
  };

  return (
    <div className="mt-5 space-y-4">
      <div
        className={cn(
          'rounded-xl border border-border-default/60 border-l-[3px] bg-gradient-to-br from-surface-deep/80 to-surface-deep/30 p-4 sm:p-5',
          accentClass(audit.status),
        )}
        title={[audit.reportDateRaw, audit.detail].filter(Boolean).join(' · ') || undefined}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Report date
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
              {audit.reportDateDisplay}
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
              <Clock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              <time dateTime={snap.scrapedAt}>{audit.scrapedAtDisplay}</time>
            </p>
          </div>
          <Activity className="hidden h-10 w-10 text-indigo-500/25 sm:block" aria-hidden />
        </div>
      </div>
      <MetricsGrid totals={totals} />
    </div>
  );
}

function LiveDetail({ live }: { live: ScraperLiveResponse }) {
  const recentSnapshots = useMemo(() => {
    const audited = withDateAudit(live.snapshots);
    return audited
      .sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime())
      .slice(0, LIVE_SNAPSHOT_LIMIT);
  }, [live.snapshots]);

  const latestRow = recentSnapshots[0] ?? null;

  const grouped = useMemo(() => {
    if (!recentSnapshots.length) return [];
    const byDate = new Map<string, AuditedRow[]>();
    for (const row of recentSnapshots) {
      const key = row.dateAudit.reportDateDisplay;
      const list = byDate.get(key) ?? [];
      list.push(row);
      byDate.set(key, list);
    }
    return [...byDate.entries()].sort((a, b) => {
      const latestA = Math.max(...a[1].map((r) => new Date(r.scrapedAt).getTime()));
      const latestB = Math.max(...b[1].map((r) => new Date(r.scrapedAt).getTime()));
      return latestB - latestA;
    });
  }, [recentSnapshots]);

  const overallTotals = useMemo(() => sumTotals(recentSnapshots), [recentSnapshots]);

  if (!grouped.length) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-border-default/60 bg-surface-deep/30 px-4 py-6 text-sm text-text-secondary">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-400" aria-hidden />
        Waiting for report rows…
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {latestRow ? (
        <div
          className={cn(
            'rounded-xl border border-emerald-500/25 border-l-[3px] bg-emerald-500/5 p-4',
            accentClass(latestRow.dateAudit.status),
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/90">
            Latest update
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {latestRow.dateAudit.reportDateDisplay}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <time dateTime={latestRow.scrapedAt}>{latestRow.dateAudit.scrapedAtDisplay}</time>
          </p>
        </div>
      ) : null}

      <MetricsGrid totals={overallTotals} />

      <div className="space-y-5">
        {grouped.map(([displayDate, rows]) => (
          <ReportDateGroup key={displayDate} reportDate={displayDate} rows={rows} />
        ))}
      </div>

      <p className="text-center text-xs text-text-secondary">
        Showing latest {recentSnapshots.length} of {live.snapshots.length} updates (by scrape time)
      </p>
    </div>
  );
}

function LiveScrapeSkeleton() {
  return (
    <div className="mt-5 animate-pulse space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-deep" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-24 rounded-xl bg-surface-deep" />
        <div className="h-24 rounded-xl bg-surface-deep" />
      </div>
    </div>
  );
}

export function KhananConfigLiveScrape({ status, scrapeActive, live, loading }: Props) {
  const hasHistory = Boolean(status.latestSnapshot && status.latestSnapshotStats);

  if (!scrapeActive && !hasHistory) {
    return (
      <Card>
        <SectionHeader title="Scrape activity" />
        <div className="mt-4">
          <EmptyStateCard message="No scrape data yet" />
        </div>
      </Card>
    );
  }

  if (!scrapeActive) {
    return (
      <Card className="border-slate-700/50">
        <SectionHeader title="Last scrape" subtitle="Most recent completed run" />
        <IdleSummary status={status} />
      </Card>
    );
  }

  if (loading && !live) {
    return (
      <Card className="border-emerald-500/20">
        <SectionHeader title="Live activity" subtitle="Fetching latest rows" live />
        <LiveScrapeSkeleton />
      </Card>
    );
  }

  const showLive = live && live.snapshots.length > 0;
  const updateCount = live?.snapshots.length ?? 0;
  const latestLiveSnapshot = live?.snapshots.reduce<LiveSnapshotRow | null>((best, row) => {
    if (!best || new Date(row.scrapedAt) > new Date(best.scrapedAt)) return row;
    return best;
  }, null);
  const latestLiveAudit = latestLiveSnapshot
    ? auditLiveScrapeDates(latestLiveSnapshot.reportDate, latestLiveSnapshot.scrapedAt)
    : null;

  return (
    <Card className="relative overflow-hidden border-emerald-500/25" aria-live="polite">
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      <SectionHeader
        title="Live activity"
        subtitle={
          showLive && latestLiveAudit
            ? `Latest: ${latestLiveAudit.reportDateDisplay} · ${latestLiveAudit.scrapedAtDisplay}`
            : showLive
              ? `${Math.min(updateCount, LIVE_SNAPSHOT_LIMIT)} recent updates`
              : 'Starting scrape'
        }
        live
      />
      {showLive && live ? (
        <LiveDetail live={live} />
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 px-4 py-8 text-sm text-emerald-100/80">
          <Inbox className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
          Starting…
        </div>
      )}
    </Card>
  );
}
