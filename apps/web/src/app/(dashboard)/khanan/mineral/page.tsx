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
  EPASS_SNAPSHOTS_QUERY_KEY,
  fetchEpassSnapshots,
  fetchLatestEpass,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import {
  filterDistrictRowsForMineral,
  parseMineralSortKey,
  sortMineralRows,
  type MineralSortDir,
} from '@/lib/epass-mineral-view';

const SNAPSHOTS_STALE_MS = 5 * 60 * 1000;

function MineralPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const appliedFilters = useMemo(() => districtFiltersFromParams(searchParams), [searchParams]);
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
    enabled: Boolean(snapshotId),
  });

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

  const minerals = useMemo(
    () => (rowsData?.rows ? collectMinerals(rowsData.rows) : []),
    [rowsData?.rows],
  );

  const districts = useMemo(
    () => (rowsData?.rows ? collectDistricts(rowsData.rows) : []),
    [rowsData?.rows],
  );

  const displayMinerals = useMemo(() => {
    if (!snapshotId || browseEmpty || !rowsData?.rows) return [];
    const filtered = filterDistrictRowsForMineral(rowsData.rows, appliedFilters);
    const aggregated = aggregateMinerals(filtered, appliedFilters.operator);
    return sortMineralRows(aggregated, sortKey, sortDir);
  }, [rowsData?.rows, appliedFilters, sortKey, sortDir, snapshotId, browseEmpty]);

  const handleApplyFilters = useCallback(
    (next: DistrictFilterValues) => {
      const patch = districtParamsFromFilters(next, null, 'asc');
      updateParams(patch);
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    const latest = snapshotsData?.items[0];
    updateParams({
      operator: null,
      mineral: null,
      dateMode: null,
      dateFrom: null,
      dateTo: null,
      district: null,
      hideZeroPasses: null,
      snapshotId: latest?.id ?? null,
      reportDate: latest?.reportDate ?? null,
      sort: null,
      dir: null,
    });
  }, [snapshotsData, updateParams]);

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving = isSnapshotResolving(snapshotsLoaded, snapshotId, browseEmpty);
  const pageLoading = snapshotsLoading || snapshotResolving || (Boolean(snapshotId) && rowsLoading);
  const isError = snapshotsError || rowsError;
  const refetch = () => {
    void refetchSnapshots();
    if (snapshotId) void refetchRows();
  };

  if (isError) {
    return <DataErrorCard onRetry={() => refetch()} />;
  }

  if (pageLoading) {
    return <EpassBrowsePageLoading />;
  }

  return (
    <PageStack>
      {snapshotId && rowsData?.snapshot ? (
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
        />
      ) : null}

      {browseEmpty ? (
        <EpassEmptyState {...browseEmptyState} />
      ) : snapshotId && rowsData ? (
        <MineralSummaryTable minerals={displayMinerals} operatorFilter={appliedFilters.operator} />
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
