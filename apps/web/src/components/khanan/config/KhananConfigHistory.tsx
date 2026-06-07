'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { auditLiveScrapeDates } from '@/lib/live-scrape-date-audit';
import {
  dedupeHistorySnapshotsByReportDate,
  HISTORY_FETCH_LIMIT,
  HISTORY_INITIAL_VISIBLE,
  HISTORY_SCROLL_CLASS,
  HISTORY_SHOW_MORE_STEP,
  sliceForHistoryPreview,
} from '@/lib/khanan-config-history-view';
import {
  SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY,
  fetchScraperSnapshotHistory,
} from '@/lib/scraper-config';
import type { LiveSnapshotRow, ScraperConfigStatus } from '@/lib/scraper-config-types';
import { cn } from '@/lib/utils';

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

/** Current BullMQ queue — what is in line / running right now (not lifetime DB totals). */
function QueueStatusChips({
  status,
  scrapeActive,
}: {
  status: ScraperConfigStatus;
  scrapeActive: boolean;
}) {
  const q = status.queue;
  const waiting = q.waiting ?? 0;
  const active = q.active ?? 0;
  const delayed = q.delayed ?? 0;
  const inQueue = waiting + delayed;

  if (!scrapeActive && inQueue === 0 && active === 0) return null;

  const chips: Array<{ key: string; label: string; tone: 'amber' | 'emerald' }> = [];
  if (inQueue > 0) {
    chips.push({ key: 'queue', label: `In queue: ${formatCount(inQueue)}`, tone: 'amber' });
  }
  if (active > 0) {
    chips.push({ key: 'active', label: `Running: ${formatCount(active)}`, tone: 'emerald' });
  }
  if (chips.length === 0 && scrapeActive) {
    chips.push({ key: 'busy', label: 'Finishing up…', tone: 'amber' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Chip key={chip.key} tone={chip.tone}>
            {chip.label}
          </Chip>
        ))}
      </div>
      <p className="text-xs text-text-secondary">
        Queue status for the current scrape session — not total rows scraped.
      </p>
    </div>
  );
}

function HistorySnapshotRow({ row }: { row: LiveSnapshotRow }) {
  const audit = auditLiveScrapeDates(row.reportDate, row.scrapedAt);
  const rescrapeCount = row.snapshotCountForDate ?? 1;

  return (
    <MobileDataCard
      eyebrow="Scrape run"
      title={
        <span className="inline-flex items-center gap-1.5">
          {audit.reportDateDisplay}
          {rescrapeCount > 1 ? (
            <Chip tone="default" className="px-1.5 py-0 text-[10px]">
              ×{rescrapeCount}
            </Chip>
          ) : null}
        </span>
      }
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
    <div className="animate-pulse space-y-2">
      <div className="h-8 rounded-lg bg-surface-deep" />
      <div className="h-8 rounded-lg bg-surface-deep" />
      <div className="h-8 rounded-lg bg-surface-deep" />
    </div>
  );
}

function HistoryFooter({
  visibleCount,
  totalCount,
  noun,
  onShowMore,
}: {
  visibleCount: number;
  totalCount: number;
  noun: string;
  onShowMore: () => void;
}) {
  if (totalCount === 0) return null;

  const truncated = visibleCount < totalCount;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <p className="text-xs text-text-secondary">
        Showing {Math.min(visibleCount, totalCount)} of {totalCount} {noun}
      </p>
      {truncated ? (
        <button
          type="button"
          onClick={onShowMore}
          className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}

export function KhananConfigHistory({ status, scrapeActive = false }: Props) {
  const [runsVisible, setRunsVisible] = useState(HISTORY_INITIAL_VISIBLE);

  const pollMs = scrapeActive ? 4_000 : 60_000;

  const {
    data: snapshotData,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
  } = useQuery({
    queryKey: [...SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY, HISTORY_FETCH_LIMIT],
    queryFn: () => fetchScraperSnapshotHistory(HISTORY_FETCH_LIMIT),
    refetchInterval: pollMs,
  });

  const dedupedSnapshots = dedupeHistorySnapshotsByReportDate(snapshotData?.items ?? []);
  const visibleSnapshots = sliceForHistoryPreview(dedupedSnapshots, runsVisible);

  const showMoreRuns = () => {
    setRunsVisible((n) => Math.min(n + HISTORY_SHOW_MORE_STEP, dedupedSnapshots.length));
  };

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">History</h3>
      <QueueStatusChips status={status} scrapeActive={scrapeActive} />

      <div className="mt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Scrape runs
        </h4>
        <p className="mt-1 text-xs text-text-secondary">
          Completed report dates — sorted by most recently scraped.
        </p>
        <div className="mt-3">
          {snapshotsLoading ? (
            <HistorySkeleton />
          ) : snapshotsError ? (
            <p className="text-sm text-text-secondary">Unable to load data</p>
          ) : dedupedSnapshots.length === 0 ? (
            <EmptyStateCard message="No data available" />
          ) : (
            <>
              <div className={cn(HISTORY_SCROLL_CLASS)}>
                <div className="space-y-2 md:hidden">
                  {visibleSnapshots.map((row) => (
                    <HistorySnapshotRow key={row.id} row={row} />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 text-[11px] uppercase text-text-secondary">
                        <th className="pb-1.5 pr-3">Report date</th>
                        <th className="pb-1.5 pr-3">Scraped at</th>
                        <th className="pb-1.5 pr-3">Source</th>
                        <th className="pb-1.5 pr-3 text-right">District</th>
                        <th className="pb-1.5 pr-3 text-right">Consigner</th>
                        <th className="pb-1.5 pr-3 text-right">Challan</th>
                        <th className="pb-1.5 pr-3 text-right">Pass</th>
                        <th className="pb-1.5">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSnapshots.map((row) => {
                        const audit = auditLiveScrapeDates(row.reportDate, row.scrapedAt);
                        const rescrapeCount = row.snapshotCountForDate ?? 1;
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
                            <td className="py-1.5 pr-3 text-white">
                              <span className="inline-flex items-center gap-1.5">
                                {audit.reportDateDisplay}
                                {rescrapeCount > 1 ? (
                                  <Chip tone="default" className="px-1.5 py-0 text-[10px]">
                                    ×{rescrapeCount}
                                  </Chip>
                                ) : null}
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 tabular-nums text-text-secondary">
                              <time dateTime={row.scrapedAt}>{audit.scrapedAtDisplay}</time>
                            </td>
                            <td className="py-1.5 pr-3 text-text-secondary">
                              {snapshotSourceLabel(row.sourceUrl)}
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums text-text-secondary">
                              {formatCount(row.districtRows)}
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums text-text-secondary">
                              {formatCount(row.consignerRows)}
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums text-text-secondary">
                              {formatCount(row.challanRows)}
                            </td>
                            <td className="py-1.5 pr-3 text-right tabular-nums text-text-secondary">
                              {formatCount(row.passRows)}
                            </td>
                            <td className="py-1.5">
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
              </div>
              <HistoryFooter
                visibleCount={visibleSnapshots.length}
                totalCount={dedupedSnapshots.length}
                noun="runs"
                onShowMore={showMoreRuns}
              />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
