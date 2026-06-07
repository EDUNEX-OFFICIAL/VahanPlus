'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { getEpassBrowseEmptyState, isEpassBrowseEmpty } from '@/lib/epass-empty-state';
import { useStaleEpassSnapshotParams } from '@/hooks/useStaleEpassSnapshotParams';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { ConsignerEpassFilters } from '@/components/khanan/ConsignerEpassFilters';
import { ConsignerGroupedView } from '@/components/khanan/ConsignerGroupedView';
import { ConsignerTable } from '@/components/khanan/ConsignerTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import {
  dedupeConsignerRows,
  groupConsignerRowsByDistrict,
  sortConsignerRows,
} from '@/lib/epass-consigner-view';
import {
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  fetchConsignerList,
  fetchDistrictConsigners,
  fetchEpassFilterOptions,
  fetchEpassSnapshotReportDates,
  fetchSnapshotDistrictRows,
  updateConsignerGhatNumber,
} from '@/lib/epass';
import {
  parseEpassFilterParams,
  serializeEpassFilterParams,
  toConsignerListQueryParams,
} from '@/lib/epass-filter-params';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import { allReportsBootstrapPatch, allReportsClearPatch } from '@/lib/epass-report-scope';
import { parseOperatorParam } from '@/lib/operator';
import {
  invalidateEpassReportingData,
  reportingQueryOptions,
  staticQueryOptions,
} from '@/lib/query-config';
import type {
  ConsignerSortDir,
  ConsignerSortKey,
  EpassBrowseFilterValues,
  OperatorType,
  EpassSnapshotDto,
} from '@/lib/epass-types';

const PAGE_SIZE = 50;

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

function parseSortKey(value: string | null): ConsignerSortKey | null {
  const keys: ConsignerSortKey[] = [
    'district',
    'consigner',
    'mineral',
    'operator',
    'role',
    'challans',
    'slNo',
  ];
  return keys.includes(value as ConsignerSortKey) ? (value as ConsignerSortKey) : null;
}

function useConsignerSortHandlers(
  searchParams: URLSearchParams,
  router: ReturnType<typeof useRouter>,
) {
  const sortKey = parseSortKey(searchParams.get('sort'));
  const sortDir: ConsignerSortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/consigner?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleSort = useCallback(
    (key: ConsignerSortKey) => {
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
      updateParams({
        ...serializeEpassFilterParams(next, {
          sort: sortKey,
          dir: sortKey ? sortDir : null,
          offset: '0',
          reportScope: next.reportScope === 'all' ? 'all' : null,
        }),
      });
    },
    [sortKey, sortDir, updateParams],
  );

  return { sortKey, sortDir, updateParams, handleSort, handleApplyFilters };
}

function useSaveGhatNumber() {
  const queryClient = useQueryClient();
  return useCallback(
    async (consignerRowId: string, ghatNumber: string) => {
      await updateConsignerGhatNumber(consignerRowId, ghatNumber);
      await invalidateEpassReportingData(queryClient);
    },
    [queryClient],
  );
}

function ConsignerDrillDown({
  districtRowId,
  operatorType,
}: {
  districtRowId: string;
  operatorType: OperatorType;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const onSaveGhatNumber = useSaveGhatNumber();
  const sortKey = parseSortKey(searchParams.get('sort'));
  const sortDir: ConsignerSortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/consigner?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleSort = useCallback(
    (key: ConsignerSortKey) => {
      if (sortKey !== key) {
        updateParams({ sort: key, dir: 'asc' });
        return;
      }
      if (sortDir === 'asc') {
        updateParams({ sort: key, dir: 'desc' });
        return;
      }
      updateParams({ sort: null, dir: null });
    },
    [sortKey, sortDir, updateParams],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['epass', 'consigners', districtRowId, operatorType],
    queryFn: () => {
      return fetchDistrictConsigners(districtRowId, operatorType);
    },
    ...reportingQueryOptions,
  });

  const displayRows = useMemo(() => {
    if (!data?.items) return [];
    return sortConsignerRows(data.items, sortKey, sortDir);
  }, [data?.items, sortKey, sortDir]);

  if (isLoading) {
    return (
      <Card className="animate-pulse p-12">
        <div className="h-8 w-64 rounded bg-surface-deep" />
        <div className="mt-6 h-48 rounded bg-surface-deep" />
      </Card>
    );
  }

  if (isError || !data) {
    return <DataErrorCard onRetry={() => refetch()} />;
  }

  const opLabel = operatorType === 'lessee' ? 'Lessee' : 'Dealer';
  const opColor = operatorType === 'lessee' ? 'text-indigo-300' : 'text-emerald-300';

  return (
    <>
      <h1 className="text-2xl font-semibold text-white">
        {data.districtRow.dmoName}{' '}
        <span className={`text-lg font-medium ${opColor}`}>({opLabel})</span>
      </h1>

      {displayRows.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">No consigners found</p>
        </Card>
      ) : (
        <ConsignerTable
          rows={displayRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          consigneeLinkBase="/khanan/consignee"
          linkSearchParams={new URLSearchParams(searchParams.toString())}
          onSaveGhatNumber={onSaveGhatNumber}
        />
      )}
    </>
  );
}

function ConsignerBrowse() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onSaveGhatNumber = useSaveGhatNumber();
  const appliedFilters = useMemo(() => parseEpassFilterParams(searchParams), [searchParams]);
  const isAllReports = appliedFilters.reportScope === 'all';
  const isRangeMode =
    appliedFilters.dateMode === 'range' &&
    Boolean(appliedFilters.dateFrom || appliedFilters.dateTo);
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const pageSize = Math.max(Number(searchParams.get('limit') || String(PAGE_SIZE)), 10);
  const { sortKey, sortDir, updateParams, handleSort, handleApplyFilters } =
    useConsignerSortHandlers(searchParams, router);

  const {
    data: snapshotsData,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
    refetch: refetchSnapshots,
  } = useQuery({
    queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
    queryFn: () => fetchEpassSnapshotReportDates(),
    ...staticQueryOptions,
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
    isAllReports || isRangeMode,
  );

  useEffect(() => {
    if (!isRangeMode) return;
    if (!appliedFilters.snapshotId && !appliedFilters.reportDate) return;
    updateParams({ snapshotId: null, reportDate: null, reportScope: null });
  }, [isRangeMode, appliedFilters.snapshotId, appliedFilters.reportDate, updateParams]);

  useEffect(() => {
    const hasScope = searchParams.has('reportScope');
    const hasSnapshot = searchParams.has('snapshotId');
    if (!hasScope && !hasSnapshot && !isRangeMode) {
      updateParams(allReportsBootstrapPatch());
    }
  }, [searchParams, updateParams, isRangeMode]);

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
    ...staticQueryOptions,
  });

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', snapshotId, 'minerals'],
    queryFn: () => {
      if (!snapshotId) throw new Error('Snapshot required');
      return fetchSnapshotDistrictRows(snapshotId);
    },
    enabled: Boolean(snapshotId) && !isRangeMode && !isAllReports,
    ...staticQueryOptions,
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
    () =>
      toConsignerListQueryParams(appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize),
    [appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize],
  );

  const listEnabled =
    !browseEmpty && (isAllReports || (isRangeMode ? hasInRangeSnapshots : Boolean(snapshotId)));

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['epass', 'consigner-list', listParams],
    queryFn: () => fetchConsignerList(listParams),
    enabled: listEnabled,
    ...reportingQueryOptions,
  });

  const useGroupedView = sortKey == null || sortKey === 'district';

  const displayItems = useMemo(
    () => (data?.items ? dedupeConsignerRows(data.items) : []),
    [data?.items],
  );

  const groups = useMemo(() => {
    if (!displayItems.length || !useGroupedView) return [];
    return groupConsignerRowsByDistrict(displayItems, sortKey, sortDir);
  }, [displayItems, useGroupedView, sortKey, sortDir]);

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

  const snapshot = snapshotFromList(data?.snapshot ?? null);
  const total = data?.total ?? 0;
  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving =
    !isRangeMode && !isAllReports && isSnapshotResolving(snapshotsLoaded, snapshotId, browseEmpty);
  const pageLoading = snapshotsLoading || snapshotResolving || (listEnabled && isLoading);
  const isErrorAll = snapshotsError || isError;

  const refetchAll = () => {
    void refetchSnapshots();
    if (listEnabled) void refetch();
  };

  if (isErrorAll) {
    return (
      <DataErrorCard
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetchAll()}
      />
    );
  }

  if (pageLoading) {
    return <EpassBrowsePageLoading wrapPageStack={false} />;
  }

  return (
    <>
      {(isAllReports && data?.reportScope === 'all') ||
      (isRangeMode && data?.reportScope === 'range') ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope={isRangeMode ? 'range' : 'all'}
          countLabel="Consigners"
          snapshotCount={data?.entityCount ?? data?.snapshotCount ?? 0}
          latestScrapedAt={data?.latestScrapedAt}
          dateFrom={appliedFilters.dateFrom}
          dateTo={appliedFilters.dateTo}
        />
      ) : snapshotId && snapshot ? (
        <EpassReportMetaBar snapshot={snapshot} />
      ) : null}

      {snapshotsData ? (
        <ConsignerEpassFilters
          snapshots={snapshotsData.items}
          minerals={minerals}
          districts={districts}
          values={appliedFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          allowAllReports
          reportScope={appliedFilters.reportScope ?? 'specific'}
        />
      ) : null}

      {browseEmpty ? <EpassEmptyState {...browseEmptyState} /> : null}

      {!browseEmpty && data && listEnabled ? (
        <>
          {data.items.length === 0 ? (
            <EmptyStateCard message="No consigners found" />
          ) : (
            <>
              {useGroupedView ? (
                <ConsignerGroupedView
                  groups={groups}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  linkSearchParams={new URLSearchParams(searchParams.toString())}
                  onSaveGhatNumber={onSaveGhatNumber}
                />
              ) : (
                <ConsignerTable
                  rows={displayItems}
                  showDmo
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  consigneeLinkBase="/khanan/consignee"
                  linkSearchParams={new URLSearchParams(searchParams.toString())}
                  onSaveGhatNumber={onSaveGhatNumber}
                />
              )}

              <ResponsivePagination
                total={total}
                offset={offset}
                pageSize={pageSize}
                onPageChange={(nextOffset) => updateParams({ offset: String(nextOffset) })}
                onPageSizeChange={(nextSize) =>
                  updateParams({ limit: String(nextSize), offset: '0' })
                }
              />
            </>
          )}
        </>
      ) : null}
    </>
  );
}

function ConsignerPageContent() {
  const searchParams = useSearchParams();
  const districtRowId = searchParams.get('districtRowId') ?? '';
  const operatorParam = parseOperatorParam(searchParams.get('operator'), searchParams.get('role'));
  const operatorType: OperatorType = operatorParam === 'dealer' ? 'dealer' : 'lessee';

  if (districtRowId) {
    return (
      <PageStack>
        <ConsignerDrillDown districtRowId={districtRowId} operatorType={operatorType} />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <ConsignerBrowse />
    </PageStack>
  );
}

export default function ConsignerPage() {
  return (
    <Suspense fallback={<EpassBrowsePageSkeleton />}>
      <ConsignerPageContent />
    </Suspense>
  );
}
