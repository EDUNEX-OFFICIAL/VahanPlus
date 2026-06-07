'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { getEpassBrowseEmptyState, isEpassBrowseEmpty } from '@/lib/epass-empty-state';
import { useStaleEpassSnapshotParams } from '@/hooks/useStaleEpassSnapshotParams';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import {
  DistrictEpassFilters,
  type DistrictFilterValues,
} from '@/components/khanan/DistrictEpassFilters';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { MineralSummaryTable } from '@/components/khanan/MineralSummaryTable';
import { aggregateMinerals } from '@/lib/epass-aggregate';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import {
  districtFiltersFromParams,
  districtParamsFromFilters,
} from '@/lib/epass-district-filter-params';
import {
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  fetchDistrictRowsBrowse,
  fetchEpassFilterOptions,
  fetchEpassSnapshotReportDates,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import { allReportsBootstrapPatch, allReportsClearPatch } from '@/lib/epass-report-scope';
import {
  filterDistrictRowsForMineral,
  parseMineralSortKey,
  sortMineralRows,
  type MineralSortDir,
} from '@/lib/epass-mineral-view';
import {
  EPASS_FILTER_OPTIONS_ALL_PARAMS,
  reportingQueryOptions,
  staticQueryOptions,
} from '@/lib/query-config';

function MineralPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const appliedFilters = useMemo(() => districtFiltersFromParams(searchParams), [searchParams]);
  const isAllReports = appliedFilters.reportScope === 'all';
  const isRangeMode =
    appliedFilters.dateMode === 'range' &&
    Boolean(appliedFilters.dateFrom || appliedFilters.dateTo);
  const sortKey = parseMineralSortKey(searchParams.get('sort'));
  const sortDir: MineralSortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/mineral?${next.toString()}`);
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
    data: allDistrictBrowse,
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

  const sourceRows = isAllReports ? allDistrictBrowse?.rows : rowsData?.rows;

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

  const filteredSourceRows = useMemo(() => {
    if (!sourceRows?.length) return [];
    return filterDistrictRowsForMineral(sourceRows, appliedFilters);
  }, [sourceRows, appliedFilters]);

  const displayMinerals = useMemo(() => {
    if (browseEmpty || !sourceRows) return [];
    const aggregated = aggregateMinerals(filteredSourceRows, appliedFilters.operator);
    const rows = appliedFilters.hideZeroPasses
      ? aggregated.filter((r) => r.totalPasses > 0)
      : aggregated;
    return sortMineralRows(rows, sortKey, sortDir);
  }, [
    sourceRows,
    filteredSourceRows,
    appliedFilters.operator,
    appliedFilters.hideZeroPasses,
    sortKey,
    sortDir,
    browseEmpty,
  ]);

  const districtCount = filteredSourceRows.length;

  const handleApplyFilters = useCallback(
    (next: DistrictFilterValues) => {
      const patch = districtParamsFromFilters(next, null, 'asc');
      updateParams(patch);
    },
    [updateParams],
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

  const hasBrowseData = isAllReports ? Boolean(allDistrictBrowse) : Boolean(snapshotId && rowsData);

  if (isError) {
    return <DataErrorCard onRetry={() => refetch()} />;
  }

  if (pageLoading) {
    return <EpassBrowsePageLoading />;
  }

  return (
    <PageStack>
      {isAllReports && allDistrictBrowse ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope="all"
          countLabel="Minerals"
          snapshotCount={displayMinerals.length}
          secondaryMetric={{
            label: 'Districts',
            value: allDistrictBrowse.rows.length,
          }}
          latestScrapedAt={allDistrictBrowse.latestScrapedAt}
        />
      ) : snapshotId && rowsData?.snapshot ? (
        <EpassReportMetaBar
          snapshot={rowsData.snapshot}
          rowCountLabel="Districts"
          rowCount={rowsData.rows.length}
          secondaryMetric={{
            label: 'Minerals',
            value: displayMinerals.length,
          }}
        />
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
      ) : hasBrowseData ? (
        <MineralSummaryTable
          minerals={displayMinerals}
          operatorFilter={appliedFilters.operator}
          districtCount={districtCount}
          allReportsHint={isAllReports}
        />
      ) : null}
    </PageStack>
  );
}

export default function MineralPage() {
  return (
    <Suspense fallback={<EpassBrowsePageSkeleton />}>
      <MineralPageContent />
    </Suspense>
  );
}
