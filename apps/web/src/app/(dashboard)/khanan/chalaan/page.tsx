'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { Card } from '@/components/ui/Card';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { epassBrowseEmptyMessage, isEpassBrowseEmpty } from '@/lib/epass-empty-state';
import { useStaleEpassSnapshotParams } from '@/hooks/useStaleEpassSnapshotParams';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { ChalaanEpassFilters } from '@/components/khanan/ChalaanEpassFilters';
import { ChalaanTable } from '@/components/khanan/ChalaanTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { parseChalaanSortDir, parseChalaanSortKey } from '@/lib/epass-chalaan-view';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import {
  EPASS_SNAPSHOTS_QUERY_KEY,
  fetchChalaanPassList,
  fetchEpassSnapshots,
  fetchLatestEpass,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import {
  parseEpassFilterParams,
  serializeEpassFilterParams,
  toChalaanListQueryParams,
} from '@/lib/epass-filter-params';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import type {
  ChalaanSortDir,
  ChalaanSortKey,
  EpassBrowseFilterValues,
  EpassSnapshotDto,
} from '@/lib/epass-types';

const PAGE_SIZE = 50;
const SNAPSHOTS_STALE_MS = 5 * 60 * 1000;

function snapshotFromList(
  snap: { id: string; reportDate: string; scrapedAt: string } | null,
): EpassSnapshotDto | null {
  if (!snap) return null;
  return {
    id: snap.id,
    reportDate: snap.reportDate,
    reportGeneratedOn: '',
    scrapedAt: snap.scrapedAt,
    rowCount: 0,
    jobId: null,
  };
}

function useChalaanSortHandlers(searchParams: URLSearchParams) {
  const router = useRouter();
  const sortKey = parseChalaanSortKey(searchParams.get('sort'));
  const sortDir: ChalaanSortDir = parseChalaanSortDir(searchParams.get('dir'));

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/chalaan?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleSort = useCallback(
    (key: ChalaanSortKey) => {
      if (sortKey !== key) {
        updateParams({ sort: key, dir: 'asc', offset: '0' });
        return;
      }
      if (sortDir === 'asc') {
        updateParams({ sort: key, dir: 'desc', offset: '0' });
        return;
      }
      updateParams({ sort: null, dir: null, offset: '0' });
    },
    [sortKey, sortDir, updateParams],
  );

  const handleApplyFilters = useCallback(
    (next: EpassBrowseFilterValues) => {
      const patch = serializeEpassFilterParams(next, {
        sort: sortKey,
        dir: sortKey ? sortDir : null,
        offset: '0',
      });
      updateParams(patch);
    },
    [sortKey, sortDir, updateParams],
  );

  return { sortKey, sortDir, updateParams, handleSort, handleApplyFilters };
}

function ChalaanPageContent() {
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(() => parseEpassFilterParams(searchParams), [searchParams]);
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const pageSize = Math.max(Number(searchParams.get('limit') || String(PAGE_SIZE)), 10);
  const { sortKey, sortDir, updateParams, handleSort, handleApplyFilters } =
    useChalaanSortHandlers(searchParams);

  const {
    data: snapshotsData,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
    refetch: refetchSnapshots,
  } = useQuery({
    queryKey: EPASS_SNAPSHOTS_QUERY_KEY,
    queryFn: () => {
      return fetchEpassSnapshots();
    },
    staleTime: SNAPSHOTS_STALE_MS,
  });

  const dateFilterInput = useMemo(
    () => ({
      dateMode: appliedFilters.dateMode,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      snapshotId: appliedFilters.snapshotId,
    }),
    [appliedFilters],
  );

  const snapshotId = useMemo(() => {
    if (!snapshotsData?.items.length) return appliedFilters.snapshotId || null;
    return resolveSnapshotIdForDateFilters(snapshotsData.items, dateFilterInput);
  }, [snapshotsData?.items, dateFilterInput, appliedFilters.snapshotId]);

  const browseEmpty = useMemo(
    () => isEpassBrowseEmpty(snapshotsData?.items, dateFilterInput),
    [snapshotsData?.items, dateFilterInput],
  );

  useStaleEpassSnapshotParams(
    Boolean(snapshotsData) && !snapshotsLoading,
    snapshotsData?.items.length ?? 0,
    appliedFilters.snapshotId || null,
    appliedFilters.reportDate || null,
    updateParams,
  );

  useEffect(() => {
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (snapshotId) return;
    if (browseEmpty) return;

    if (appliedFilters.dateMode === 'range' && (appliedFilters.dateFrom || appliedFilters.dateTo)) {
      const inRange = snapshotsForDateMode(
        snapshotsData.items,
        appliedFilters.dateMode,
        appliedFilters.dateFrom,
        appliedFilters.dateTo,
      );
      if (inRange.length > 0) {
        const pick = [...inRange].sort(
          (a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime(),
        )[0];
        updateParams({ snapshotId: pick.id, reportDate: pick.reportDate });
      }
      return;
    }

    const bootstrap = async () => {
      try {
        const latest = await fetchLatestEpass();
        if (latest.snapshot) {
          updateParams({
            snapshotId: latest.snapshot.id,
            reportDate: latest.snapshot.reportDate,
          });
        }
      } catch {
        const first = snapshotsData.items[0];
        if (first) {
          updateParams({ snapshotId: first.id, reportDate: first.reportDate });
        }
      }
    };

    void bootstrap();
  }, [
    snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
    browseEmpty,
    appliedFilters.dateMode,
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
  ]);

  useEffect(() => {
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (!appliedFilters.snapshotId) return;
    if (snapshotId === appliedFilters.snapshotId) return;
    updateParams({
      snapshotId: snapshotId,
      reportDate: snapshotId
        ? (snapshotsData.items.find((s) => s.id === snapshotId)?.reportDate ?? null)
        : null,
    });
  }, [snapshotId, appliedFilters.snapshotId, snapshotsLoading, snapshotsData, updateParams]);

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', snapshotId, 'chalaan-filters'],
    queryFn: () => {
      if (!snapshotId) throw new Error('Snapshot required');
      return fetchSnapshotDistrictRows(snapshotId);
    },
    enabled: Boolean(snapshotId),
  });

  const minerals = useMemo(
    () => (districtRowsData?.rows ? collectMinerals(districtRowsData.rows) : []),
    [districtRowsData?.rows],
  );

  const districts = useMemo(
    () => (districtRowsData?.rows ? collectDistricts(districtRowsData.rows) : []),
    [districtRowsData?.rows],
  );

  const listParams = useMemo(
    () => toChalaanListQueryParams(appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize),
    [appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['epass', 'chalaan-pass-list', listParams],
    queryFn: () => {
      return fetchChalaanPassList(listParams);
    },
    enabled: Boolean(snapshotId) && !browseEmpty,
  });

  const snapshot = snapshotFromList(data?.snapshot ?? null);
  const total = data?.total ?? 0;
  const pageTotals = useMemo(() => {
    const rows = data?.items ?? [];
    return {
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      chalaan: rows.length,
    };
  }, [data?.items]);

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving = isSnapshotResolving(snapshotsLoaded, snapshotId, browseEmpty);
  const pageLoading = snapshotsLoading || snapshotResolving || (Boolean(snapshotId) && isLoading);

  const handleClearFilters = useCallback(() => {
    updateParams({
      ...serializeEpassFilterParams({
        operator: 'all',
        minerals: [],
        dateMode: 'specific',
        dateFrom: '',
        dateTo: '',
        reportDate: appliedFilters.reportDate,
        snapshotId: snapshotId ?? '',
        districts: [],
        consignerSearch: '',
        hideZeroChallans: false,
        consigneeSearch: '',
        hideZeroPasses: false,
        consignerRowId: '',
        destination: '',
        challanSearch: '',
      }),
      sort: null,
      dir: null,
      offset: '0',
    });
  }, [updateParams, appliedFilters.reportDate, snapshotId]);

  if (snapshotsError || isError) {
    return (
      <PageStack>
        <DataErrorCard
          onRetry={() => {
            void refetchSnapshots();
            void refetch();
          }}
        />
      </PageStack>
    );
  }

  if (pageLoading) {
    return <EpassBrowsePageLoading />;
  }

  return (
    <PageStack>
      <EpassReportMetaBar snapshot={snapshot} />

      <ChalaanEpassFilters
        snapshots={snapshotsData?.items ?? []}
        minerals={minerals}
        districts={districts}
        values={{ ...appliedFilters, consignerRowId: '' }}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        showChallanSearch
        showDestinationSearch
      />

      {browseEmpty ? (
        <EpassEmptyState message={epassBrowseEmptyMessage(snapshotsData?.items, dateFilterInput)} />
      ) : data ? (
        <>
          <ChalaanTable rows={data.items} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          {data.items.length > 0 ? (
            <Card>
              <div className="flex flex-wrap gap-6 text-sm">
                <p className="tabular-nums text-text-secondary">
                  Total Chalaan:{' '}
                  <span className="font-semibold text-white">{pageTotals.chalaan}</span>
                </p>
                <p className="tabular-nums text-text-secondary">
                  Total Quantity:{' '}
                  <span className="font-semibold text-white">{pageTotals.quantity.toFixed(2)}</span>
                </p>
              </div>
            </Card>
          ) : null}
          {data.items.length > 0 ? (
            <ResponsivePagination
              total={total}
              offset={offset}
              pageSize={pageSize}
              onPageChange={(nextOffset) => updateParams({ offset: String(nextOffset) })}
              onPageSizeChange={(nextSize) =>
                updateParams({ limit: String(nextSize), offset: '0' })
              }
            />
          ) : null}
        </>
      ) : null}
    </PageStack>
  );
}

export default function ChalaanPage() {
  return (
    <Suspense fallback={<EpassBrowsePageSkeleton />}>
      <ChalaanPageContent />
    </Suspense>
  );
}
