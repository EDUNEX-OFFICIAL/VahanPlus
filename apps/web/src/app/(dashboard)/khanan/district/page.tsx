'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { Card } from '@/components/ui/Card';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import {
  DistrictEpassFilters,
  type DistrictFilterValues,
} from '@/components/khanan/DistrictEpassFilters';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { getEpassBrowseEmptyState, isEpassBrowseEmpty } from '@/lib/epass-empty-state';
import { useStaleEpassSnapshotParams } from '@/hooks/useStaleEpassSnapshotParams';
import { DistrictEpassTable } from '@/components/khanan/DistrictEpassTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import {
  aggregateDistrictRowsByDmo,
  applyDistrictFilters,
  collectDistricts,
  collectMinerals,
  sortDistrictRows,
} from '@/lib/epass-district-view';
import {
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  fetchDistrictRowsBrowse,
  fetchEpassFilterOptions,
  fetchEpassSnapshotReportDates,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import { allReportsBootstrapPatch, allReportsClearPatch } from '@/lib/epass-report-scope';
import type { DistrictSortDir, DistrictSortKey } from '@/lib/epass-types';
import {
  districtFiltersFromParams,
  districtParamsFromFilters,
  parseDistrictSortKey,
} from '@/lib/epass-district-filter-params';
import {
  EPASS_FILTER_OPTIONS_ALL_PARAMS,
  reportingQueryOptions,
  staticQueryOptions,
} from '@/lib/query-config';

function DistrictPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const appliedFilters = useMemo(() => districtFiltersFromParams(searchParams), [searchParams]);
  const isAllReports = appliedFilters.reportScope === 'all';
  const isRangeMode =
    appliedFilters.dateMode === 'range' &&
    Boolean(appliedFilters.dateFrom || appliedFilters.dateTo);
  const sortKey = parseDistrictSortKey(searchParams.get('sort'));
  const sortDir: DistrictSortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/district?${next.toString()}`);
    },
    [router, searchParams],
  );

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

  const {
    data: allRowsData,
    isLoading: allRowsLoading,
    isError: allRowsError,
    refetch: refetchAllRows,
  } = useQuery({
    queryKey: ['epass', 'district-rows-browse'],
    queryFn: () => fetchDistrictRowsBrowse({ reportScope: 'all' }),
    enabled: isAllReports && !browseEmpty,
    ...reportingQueryOptions,
  });

  const {
    data: rowsData,
    isLoading: rowsLoading,
    isError: rowsError,
    refetch: refetchRows,
  } = useQuery({
    queryKey: ['epass', 'snapshot-rows', snapshotId],
    queryFn: () => {
      if (!snapshotId) throw new Error('Snapshot required');
      return fetchSnapshotDistrictRows(snapshotId);
    },
    enabled: Boolean(snapshotId) && !isAllReports,
    ...reportingQueryOptions,
  });

  const { data: allFilterOptions } = useQuery({
    queryKey: ['epass', 'filter-options', EPASS_FILTER_OPTIONS_ALL_PARAMS],
    queryFn: () => fetchEpassFilterOptions(EPASS_FILTER_OPTIONS_ALL_PARAMS),
    enabled: isAllReports && Boolean(snapshotsData?.items.length),
    ...staticQueryOptions,
  });

  useEffect(() => {
    if (isAllReports) return;
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (snapshotId) return;
    if (browseEmpty) return;

    if (isRangeMode) {
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
        updateParams({ snapshotId: pick.id, reportDate: pick.reportDate, reportScope: null });
      }
      return;
    }
  }, [
    isAllReports,
    isRangeMode,
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
    if (isAllReports) return;
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
    snapshotId,
    appliedFilters.snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
  ]);

  const sourceRows = isAllReports ? allRowsData?.rows : rowsData?.rows;

  const minerals = useMemo(() => {
    if (sourceRows?.length) return collectMinerals(sourceRows);
    if (isAllReports) return allFilterOptions?.minerals ?? [];
    return [];
  }, [sourceRows, isAllReports, allFilterOptions?.minerals]);

  const districts = useMemo(() => {
    if (sourceRows?.length) return collectDistricts(sourceRows);
    if (isAllReports) return allFilterOptions?.districts ?? [];
    return [];
  }, [sourceRows, isAllReports, allFilterOptions?.districts]);

  const displayRows = useMemo(() => {
    const canShow = isAllReports
      ? !browseEmpty && sourceRows
      : snapshotId && !browseEmpty && sourceRows;
    if (!canShow || !sourceRows) return [];
    const baseRows = aggregateDistrictRowsByDmo(
      sourceRows,
      appliedFilters.operator,
      appliedFilters.minerals,
    );
    const filtered = applyDistrictFilters(baseRows, {
      minerals: appliedFilters.minerals,
      districts: appliedFilters.districts,
      hideZeroPasses: appliedFilters.hideZeroPasses,
    });
    return sortDistrictRows(filtered, sortKey, sortDir);
  }, [sourceRows, appliedFilters, sortKey, sortDir, snapshotId, browseEmpty, isAllReports]);

  const totals = useMemo(() => {
    return displayRows.reduce(
      (acc, row) => {
        acc.totalUsers += row.totalUsers;
        acc.totalPasses += row.passes;
        acc.totalQuantity += row.quantity;
        return acc;
      },
      { totalUsers: 0, totalPasses: 0, totalQuantity: 0 },
    );
  }, [displayRows]);

  const handleApplyFilters = useCallback(
    (next: DistrictFilterValues) => {
      const patch = districtParamsFromFilters(next, sortKey, sortDir);
      updateParams(patch);
    },
    [sortKey, sortDir, updateParams],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      ...allReportsClearPatch(),
      operator: null,
      mineral: null,
      district: null,
      hideZeroPasses: null,
      sort: null,
      dir: null,
    });
  }, [updateParams]);

  const handleSort = useCallback(
    (key: DistrictSortKey) => {
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

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving = isSnapshotResolving(
    snapshotsLoaded,
    snapshotId,
    browseEmpty,
    isAllReports,
  );
  const rowsQueryLoading = isAllReports ? allRowsLoading : rowsLoading;
  const pageLoading =
    snapshotsLoading ||
    snapshotResolving ||
    ((isAllReports || Boolean(snapshotId)) && !browseEmpty && rowsQueryLoading);
  const isError = snapshotsError || rowsError || allRowsError;
  const refetch = () => {
    void refetchSnapshots();
    if (isAllReports) void refetchAllRows();
    else if (snapshotId) void refetchRows();
  };

  if (isError) {
    return <DataErrorCard onRetry={() => refetch()} />;
  }

  if (pageLoading) {
    return <EpassBrowsePageLoading />;
  }

  return (
    <PageStack>
      {isAllReports && allRowsData ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope="all"
          countLabel="Districts"
          snapshotCount={allRowsData.entityCount ?? allRowsData.snapshotCount}
          latestScrapedAt={allRowsData.latestScrapedAt}
        />
      ) : snapshotId && rowsData?.snapshot ? (
        <EpassReportMetaBar snapshot={rowsData.snapshot} />
      ) : null}

      {snapshotsData ? (
        <DistrictEpassFilters
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

      {browseEmpty ? (
        <EpassEmptyState {...browseEmptyState} />
      ) : (
        <>
          <DistrictEpassTable
            rows={displayRows}
            operatorFilter={appliedFilters.operator}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            linkSearchParams={new URLSearchParams(searchParams.toString())}
          />
          {displayRows.length > 0 ? (
            <p className="text-xs text-text-secondary tabular-nums">
              Showing {displayRows.length} row{displayRows.length === 1 ? '' : 's'}
            </p>
          ) : null}
          {displayRows.length > 0 ? (
            <Card>
              <div className="flex flex-wrap gap-6 text-sm">
                <p className="tabular-nums text-text-secondary">
                  Total Users: <span className="font-semibold text-white">{totals.totalUsers}</span>
                </p>
                <p className="tabular-nums text-text-secondary">
                  Total Passes:{' '}
                  <span className="font-semibold text-white">{totals.totalPasses}</span>
                </p>
                <p className="tabular-nums text-text-secondary">
                  Total Quantity:{' '}
                  <span className="font-semibold text-white">
                    {totals.totalQuantity.toFixed(2)}
                  </span>
                </p>
              </div>
            </Card>
          ) : null}
        </>
      )}
    </PageStack>
  );
}

export default function DistrictPage() {
  return (
    <Suspense fallback={<EpassBrowsePageSkeleton />}>
      <DistrictPageContent />
    </Suspense>
  );
}
