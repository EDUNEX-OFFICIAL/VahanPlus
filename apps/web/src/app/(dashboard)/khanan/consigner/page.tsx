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
import {
  ConsignerEpassFilters,
  type ConsignerDateMode,
  type ConsignerFilterValues,
} from '@/components/khanan/ConsignerEpassFilters';
import { ConsignerGroupedView } from '@/components/khanan/ConsignerGroupedView';
import { ConsignerTable } from '@/components/khanan/ConsignerTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import {
  collectDistricts,
  collectMinerals,
  parseDistrictsParam,
  serializeDistricts,
} from '@/lib/epass-district-view';
import {
  dedupeConsignerRows,
  groupConsignerRowsByDistrict,
  parseConsignerMineralsParam,
  serializeConsignerMinerals,
  sortConsignerRows,
} from '@/lib/epass-consigner-view';
import {
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  fetchConsignerList,
  fetchDistrictConsigners,
  fetchEpassSnapshotReportDates,
  fetchLatestEpass,
  fetchSnapshotDistrictRows,
  updateConsignerGhatNumber,
} from '@/lib/epass';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import { parseOperatorParam } from '@/lib/operator';
import type {
  ConsignerSortDir,
  ConsignerSortKey,
  OperatorType,
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

function parseDateMode(value: string | null): ConsignerDateMode {
  return value === 'range' ? 'range' : 'specific';
}

function filtersFromParams(searchParams: URLSearchParams): ConsignerFilterValues {
  const districtRaw = searchParams.get('district') ?? searchParams.get('dmo') ?? '';
  return {
    operator: parseOperatorParam(searchParams.get('operator'), searchParams.get('role')),
    minerals: parseConsignerMineralsParam(searchParams.get('mineral')),
    dateMode: parseDateMode(searchParams.get('dateMode')),
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    reportDate: searchParams.get('reportDate') ?? '',
    snapshotId: searchParams.get('snapshotId') ?? '',
    districts: parseDistrictsParam(districtRaw),
    consignerSearch: searchParams.get('consigner') ?? '',
    hideZeroChallans: searchParams.get('hideZeroChallans') === '1',
  };
}

function paramsFromFilters(
  filters: ConsignerFilterValues,
  sortKey: ConsignerSortKey | null,
  sortDir: ConsignerSortDir,
  offset: number,
): Record<string, string | null> {
  return {
    snapshotId: filters.snapshotId || null,
    reportDate: filters.reportDate || null,
    dateMode: filters.dateMode === 'specific' ? null : filters.dateMode,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    operator: filters.operator === 'all' ? null : filters.operator,
    role: null,
    mineral: serializeConsignerMinerals(filters.minerals) ?? null,
    district: serializeDistricts(filters.districts),
    dmo: null,
    consigner: filters.consignerSearch.trim() || null,
    hideZeroChallans: filters.hideZeroChallans ? '1' : null,
    sort: sortKey,
    dir: sortKey ? sortDir : null,
    offset: offset > 0 ? String(offset) : null,
  };
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
    (next: ConsignerFilterValues) => {
      const patch = paramsFromFilters(next, sortKey, sortDir, 0);
      updateParams(patch);
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
      await queryClient.invalidateQueries({ queryKey: ['epass'] });
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
  const appliedFilters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const { sortKey, sortDir, updateParams, handleSort, handleApplyFilters } =
    useConsignerSortHandlers(searchParams, router);

  const roleFilter = appliedFilters.operator === 'all' ? undefined : appliedFilters.operator;

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
    queryKey: ['epass', 'snapshot-rows', snapshotId, 'minerals'],
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
  const pageSize = Math.max(Number(searchParams.get('limit') || String(PAGE_SIZE)), 10);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'epass',
      'consigner-list',
      snapshotId,
      roleFilter,
      appliedFilters.districts,
      appliedFilters.minerals,
      appliedFilters.consignerSearch,
      appliedFilters.hideZeroChallans,
      sortKey,
      sortDir,
      offset,
      pageSize,
    ],
    queryFn: () => {
      return fetchConsignerList({
        snapshotId: snapshotId || undefined,
        operator: roleFilter,
        district: serializeDistricts(appliedFilters.districts) ?? undefined,
        mineral: serializeConsignerMinerals(appliedFilters.minerals),
        consigner: appliedFilters.consignerSearch.trim() || undefined,
        hideZeroChallans: appliedFilters.hideZeroChallans,
        sort: sortKey ?? 'district',
        dir: sortDir,
        limit: pageSize,
        offset,
      });
    },
    enabled: Boolean(snapshotId),
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
    const latest = snapshotsData?.items[0];
    updateParams({
      role: null,
      mineral: null,
      dateMode: null,
      dateFrom: null,
      dateTo: null,
      district: null,
      dmo: null,
      consigner: null,
      hideZeroChallans: null,
      snapshotId: latest?.id ?? null,
      reportDate: latest?.reportDate ?? null,
      sort: null,
      dir: null,
      offset: null,
    });
  }, [snapshotsData, updateParams]);

  const snapshot = snapshotFromList(data?.snapshot ?? null);
  const total = data?.total ?? 0;
  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving = isSnapshotResolving(snapshotsLoaded, snapshotId, browseEmpty);
  const pageLoading = snapshotsLoading || snapshotResolving || (Boolean(snapshotId) && isLoading);
  const isErrorAll = snapshotsError || isError;

  const refetchAll = () => {
    void refetchSnapshots();
    if (snapshotId) void refetch();
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
      {snapshotId && snapshot ? <EpassReportMetaBar snapshot={snapshot} /> : null}

      {snapshotsData ? (
        <ConsignerEpassFilters
          snapshots={snapshotsData.items}
          minerals={minerals}
          districts={districts}
          values={appliedFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      ) : null}

      {browseEmpty ? <EpassEmptyState {...browseEmptyState} /> : null}

      {!browseEmpty && data && snapshotId ? (
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
