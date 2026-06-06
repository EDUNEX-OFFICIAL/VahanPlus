'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { KhananConfigJobsTable } from '@/components/khanan/config/KhananConfigJobsTable';
import { auditLiveScrapeDates } from '@/lib/live-scrape-date-audit';
import { formatJobStatusLabel } from '@/lib/scraper-config-labels';
import {
  SCRAPER_JOBS_QUERY_KEY,
  SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY,
  fetchScraperJobs,
  fetchScraperSnapshotHistory,
} from '@/lib/scraper-config';
import type { LiveSnapshotRow, ScraperConfigStatus } from '@/lib/scraper-config-types';
import { cn } from '@/lib/utils';

const HISTORY_SNAPSHOT_LIMIT = 50;
const HISTORY_JOBS_LIMIT = 50;

interface Props {
  status: ScraperConfigStatus;
  scrapeActive?: boolean;
}

function snapshotSourceLabel(sourceUrl: string | null | undefined): string {
  return sourceUrl === 'import' ? 'Import' : 'Scrape';
}

function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}

function districtHref(row: LiveSnapshotRow): string {
  const params = new URLSearchParams({
    snapshotId: row.id,
    reportDate: row.reportDate,
  });
  return `/khanan/district?${params.toString()}`;
}

function StatusChips({ status }: { status: ScraperConfigStatus }) {
  const counts = status.scrapeJobsByStatus ?? {};
  const chips = [
    { key: 'completed', label: formatJobStatusLabel('completed'), tone: 'emerald' as const },
    { key: 'failed', label: formatJobStatusLabel('failed'), tone: 'red' as const },
    { key: 'pending', label: formatJobStatusLabel('pending'), tone: 'amber' as const },
    { key: 'active', label: formatJobStatusLabel('active'), tone: 'amber' as const },
  ].filter((c) => (counts[c.key] ?? 0) > 0);

  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Chip key={chip.key} tone={chip.tone}>
          {chip.label}: {counts[chip.key]}
        </Chip>
      ))}
    </div>
  );
}

function HistorySnapshotRow({ row }: { row: LiveSnapshotRow }) {
  const audit = auditLiveScrapeDates(row.reportDate, row.scrapedAt);

  return (
    <MobileDataCard
      eyebrow="Scrape run"
      title={audit.reportDateDisplay}
      meta={
        <Link
          href={districtHref(row)}
          className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
        >
          View
        </Link>
      }
    >
      <DataField label="Scraped at" value={audit.scrapedAtDisplay} />
      <DataField label="Source" value={snapshotSourceLabel(row.sourceUrl)} />
      <DataField label="District" value={formatCount(row.districtRows)} />
      <DataField label="Consigner" value={formatCount(row.consignerRows)} />
      <DataField label="Challan" value={formatCount(row.challanRows)} />
      <DataField label="Pass" value={formatCount(row.passRows)} />
    </MobileDataCard>
  );
}

function HistorySkeleton() {
  return (
    <div className="mt-5 animate-pulse space-y-3">
      <div className="h-10 rounded-lg bg-surface-deep" />
      <div className="h-10 rounded-lg bg-surface-deep" />
      <div className="h-10 rounded-lg bg-surface-deep" />
    </div>
  );
}

export function KhananConfigHistory({ status, scrapeActive = false }: Props) {
  const pollMs = scrapeActive ? 4_000 : 60_000;

  const {
    data: snapshotData,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
  } = useQuery({
    queryKey: [...SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY, HISTORY_SNAPSHOT_LIMIT],
    queryFn: () => fetchScraperSnapshotHistory(HISTORY_SNAPSHOT_LIMIT),
    refetchInterval: pollMs,
  });

  const {
    data: jobsData,
    isLoading: jobsLoading,
    isError: jobsError,
  } = useQuery({
    queryKey: [...SCRAPER_JOBS_QUERY_KEY, HISTORY_JOBS_LIMIT, 'portal'],
    queryFn: () => fetchScraperJobs(HISTORY_JOBS_LIMIT, 'portal'),
    refetchInterval: pollMs,
  });

  const snapshots = snapshotData?.items ?? [];
  const jobs = jobsData?.items ?? [];

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">History</h3>
      <StatusChips status={status} />

      <div className="mt-6 space-y-8">
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Scrape runs
          </h4>
          {snapshotsLoading ? (
            <HistorySkeleton />
          ) : snapshotsError ? (
            <p className="mt-4 text-sm text-text-secondary">Unable to load data</p>
          ) : snapshots.length === 0 ? (
            <div className="mt-4">
              <EmptyStateCard message="No data available" />
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3 md:hidden">
                {snapshots.map((row) => (
                  <HistorySnapshotRow key={row.id} row={row} />
                ))}
              </div>
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs uppercase text-text-secondary">
                      <th className="pb-2 pr-4">Report date</th>
                      <th className="pb-2 pr-4">Scraped at</th>
                      <th className="pb-2 pr-4">Source</th>
                      <th className="pb-2 pr-4 text-right">District</th>
                      <th className="pb-2 pr-4 text-right">Consigner</th>
                      <th className="pb-2 pr-4 text-right">Challan</th>
                      <th className="pb-2 pr-4 text-right">Pass</th>
                      <th className="pb-2">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((row) => {
                      const audit = auditLiveScrapeDates(row.reportDate, row.scrapedAt);
                      const hasActivity =
                        row.districtRows > 0 ||
                        row.consignerRows > 0 ||
                        row.challanRows > 0 ||
                        row.passRows > 0;
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            'border-b border-slate-800/50',
                            !hasActivity && 'opacity-80',
                          )}
                        >
                          <td className="py-2 pr-4 text-white">{audit.reportDateDisplay}</td>
                          <td className="py-2 pr-4 tabular-nums text-text-secondary">
                            <time dateTime={row.scrapedAt}>{audit.scrapedAtDisplay}</time>
                          </td>
                          <td className="py-2 pr-4 text-text-secondary">
                            {snapshotSourceLabel(row.sourceUrl)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-text-secondary">
                            {formatCount(row.districtRows)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-text-secondary">
                            {formatCount(row.consignerRows)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-text-secondary">
                            {formatCount(row.challanRows)}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-text-secondary">
                            {formatCount(row.passRows)}
                          </td>
                          <td className="py-2">
                            <Link
                              href={districtHref(row)}
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
            </>
          )}
        </section>

        <KhananConfigJobsTable jobs={jobs} loading={jobsLoading} title="Activity" />
        {jobsError && !jobsLoading ? (
          <p className="text-sm text-text-secondary">Unable to load activity</p>
        ) : null}
      </div>
    </Card>
  );
}
