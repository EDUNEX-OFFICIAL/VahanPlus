'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { Card } from '@/components/ui/Card';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { getEpassBrowseEmptyState, isEpassBrowseEmpty } from '@/lib/epass-empty-state';
import { useStaleEpassSnapshotParams } from '@/hooks/useStaleEpassSnapshotParams';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { ChalaanEpassFilters } from '@/components/khanan/ChalaanEpassFilters';
import { ChalaanTable } from '@/components/khanan/ChalaanTable';
import { IncompleteScrapeBanner } from '@/components/khanan/IncompleteScrapeBanner';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { parseChalaanSortDir, parseChalaanSortKey } from '@/lib/epass-chalaan-view';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import {
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  fetchChalaanPassList,
  fetchEpassFilterOptions,
  fetchEpassSnapshotReportDates,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import {
  parseEpassFilterParams,
  serializeEpassFilterParams,
  toChalaanListQueryParams,
} from '@/lib/epass-filter-params';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import { allReportsBootstrapPatch, allReportsClearPatch } from '@/lib/epass-report-scope';
import type { ConsigneeEpassFilterExtras } from '@/components/khanan/ConsigneeEpassFilters';
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
    (next: EpassBrowseFilterValues, extras?: ConsigneeEpassFilterExtras) => {
      const nextReportScope = extras?.reportScope ?? next.reportScope ?? 'specific';
      const patch = serializeEpassFilterParams(
        { ...next, reportScope: nextReportScope },
        {
          sort: sortKey,
          dir: sortKey ? sortDir : null,
          offset: '0',
          reportScope: nextReportScope === 'all' ? 'all' : null,
        },
      );
      updateParams(patch);
    },
    [sortKey, sortDir, updateParams],
  );

  return { sortKey, sortDir, updateParams, handleSort, handleApplyFilters };
}

function ChalaanPageContent() {
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(() => parseEpassFilterParams(searchParams), [searchParams]);
  const isAllReports = appliedFilters.reportScope === 'all';
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
    queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
    queryFn: () => {
      return fetchEpassSnapshotReportDates();
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

  const browseEmptyState = useMemo(
    () => getEpassBrowseEmptyState(snapshotsData?.items, dateFilterInput),
    [snapshotsData?.items, dateFilterInput],
  );

  const isRangeMode =
    appliedFilters.dateMode === 'range' &&
    Boolean(appliedFilters.dateFrom || appliedFilters.dateTo);

  const hasInRangeSnapshots = useMemo(() => {
    if (!isRangeMode || !snapshotsData?.items.length) return false;
    return (
      snapshotsForDateMode(
        snapshotsData.items,
        appliedFilters.dateMode,
        appliedFilters.dateFrom,
        appliedFilters.dateTo,
      ).length > 0
    );
  }, [
    isRangeMode,
    snapshotsData?.items,
    appliedFilters.dateMode,
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
  ]);

  useStaleEpassSnapshotParams(
    Boolean(snapshotsData) && !snapshotsLoading,
    snapshotsData?.items.length ?? 0,
    appliedFilters.snapshotId || null,
    appliedFilters.reportDate || null,
    updateParams,
    isAllReports,
  );

  useEffect(() => {
    const hasScope = searchParams.has('reportScope');
    const hasSnapshot = searchParams.has('snapshotId');
    if (!hasScope && !hasSnapshot && !isRangeMode) {
      updateParams(allReportsBootstrapPatch());
    }
  }, [searchParams, updateParams, isRangeMode]);

  useEffect(() => {
    if (isAllReports) return;
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (snapshotId) return;
    if (browseEmpty) return;
    if (isRangeMode) return;
  }, [isAllReports, snapshotId, snapshotsLoading, snapshotsData, browseEmpty, isRangeMode]);

  useEffect(() => {
    if (isAllReports) return;
    if (isRangeMode) return;
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (!appliedFilters.snapshotId) return;
    if (snapshotId === appliedFilters.snapshotId) return;
    updateParams({
      snapshotId: snapshotId,
      reportDate: snapshotId
        ? (snapshotsData.items.find((s) => s.id === snapshotId)?.reportDate ?? null)
        : null,
      reportScope: null,
    });
  }, [
    isAllReports,
    isRangeMode,
    snapshotId,
    appliedFilters.snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
  ]);

  const filterOptionsParams = useMemo(
    () => ({
      reportScope: 'all' as const,
      dateMode: isRangeMode ? ('range' as const) : undefined,
      dateFrom: appliedFilters.dateFrom || undefined,
      dateTo: appliedFilters.dateTo || undefined,
    }),
    [isRangeMode, appliedFilters.dateFrom, appliedFilters.dateTo],
  );

  const { data: rangeFilterOptions } = useQuery({
    queryKey: ['epass', 'filter-options', filterOptionsParams],
    queryFn: () => fetchEpassFilterOptions(filterOptionsParams),
    enabled: (isRangeMode || isAllReports) && Boolean(snapshotsData?.items.length),
    staleTime: SNAPSHOTS_STALE_MS,
  });

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', snapshotId, 'chalaan-filters'],
    queryFn: () => {
      if (!snapshotId) throw new Error('Snapshot required');
      return fetchSnapshotDistrictRows(snapshotId);
    },
    enabled: Boolean(snapshotId) && !isRangeMode && !isAllReports,
  });

  const minerals = useMemo(() => {
    if (isRangeMode || isAllReports) return rangeFilterOptions?.minerals ?? [];
    return districtRowsData?.rows ? collectMinerals(districtRowsData.rows) : [];
  }, [isRangeMode, isAllReports, rangeFilterOptions?.minerals, districtRowsData?.rows]);

  const districts = useMemo(() => {
    if (isRangeMode || isAllReports) return rangeFilterOptions?.districts ?? [];
    return districtRowsData?.rows ? collectDistricts(districtRowsData.rows) : [];
  }, [isRangeMode, isAllReports, rangeFilterOptions?.districts, districtRowsData?.rows]);

  const listParams = useMemo(
    () => toChalaanListQueryParams(appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize),
    [appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize],
  );

  const listEnabled =
    !browseEmpty && (isAllReports || (isRangeMode ? hasInRangeSnapshots : Boolean(snapshotId)));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['epass', 'chalaan-pass-list', listParams],
    queryFn: () => {
      return fetchChalaanPassList(listParams);
    },
    enabled: listEnabled,
  });

  const snapshot = snapshotFromList(data?.snapshot ?? null);
  const total = data?.total ?? 0;
  const totalQuantity = data?.totalQuantity ?? 0;

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving =
    !isRangeMode && !isAllReports && isSnapshotResolving(snapshotsLoaded, snapshotId, browseEmpty);
  const pageLoading = snapshotsLoading || snapshotResolving || (listEnabled && isLoading);

  const handleClearFilters = useCallback(() => {
    updateParams({
      ...allReportsClearPatch(),
      ...serializeEpassFilterParams({
        operator: 'all',
        minerals: [],
        dateMode: 'specific',
        dateFrom: '',
        dateTo: '',
        reportDate: '',
        snapshotId: '',
        reportScope: 'all',
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
  }, [updateParams]);

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
      {(isAllReports && data?.reportScope === 'all') ||
      (isRangeMode && data?.reportScope === 'range') ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope={isRangeMode ? 'range' : 'all'}
          countLabel="Challans"
          snapshotCount={data?.entityCount ?? data?.snapshotCount}
          latestScrapedAt={data?.latestScrapedAt}
          dateFrom={appliedFilters.dateFrom}
          dateTo={appliedFilters.dateTo}
        />
      ) : (
        <EpassReportMetaBar snapshot={snapshot} />
      )}

      <ChalaanEpassFilters
        snapshots={snapshotsData?.items ?? []}
        minerals={minerals}
        districts={districts}
        values={{ ...appliedFilters, consignerRowId: '' }}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        showChallanSearch
        showDestinationSearch
        allowAllReports
        reportScope={appliedFilters.reportScope ?? 'specific'}
      />

      {browseEmpty ? (
        <EpassEmptyState {...browseEmptyState} />
      ) : data ? (
        <>
          {data.incompleteScrape && data.portalPassTotal != null ? (
            <IncompleteScrapeBanner portalCount={data.portalPassTotal} storedCount={total} />
          ) : null}
          <ChalaanTable rows={data.items} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          {data.items.length > 0 ? (
            <Card>
              <div className="flex flex-wrap gap-6 text-sm">
                <p className="tabular-nums text-text-secondary">
                  Total Chalaan: <span className="font-semibold text-white">{total}</span>
                </p>
                <p className="tabular-nums text-text-secondary">
                  Total Quantity:{' '}
                  <span className="font-semibold text-white">{totalQuantity.toFixed(2)}</span>
                </p>
                {data.truncated ? (
                  <p className="text-xs text-text-secondary">Capped at 25000 rows</p>
                ) : null}
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
