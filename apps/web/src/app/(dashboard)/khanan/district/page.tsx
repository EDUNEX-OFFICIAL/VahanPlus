'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import {
  DistrictEpassFilters,
  type DistrictFilterValues,
} from '@/components/khanan/DistrictEpassFilters';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
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
  EPASS_SNAPSHOTS_QUERY_KEY,
  fetchEpassSnapshots,
  fetchLatestEpass,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import {
  hasActiveDateRangeWithNoSnapshots,
  resolveSnapshotIdForDateFilters,
  snapshotsForDateMode,
} from '@/lib/epass-report-date';
import type { DistrictSortDir, DistrictSortKey } from '@/lib/epass-types';
import {
  districtFiltersFromParams,
  districtParamsFromFilters,
  parseDistrictSortKey,
} from '@/lib/epass-district-filter-params';

const SNAPSHOTS_STALE_MS = 5 * 60 * 1000;

function DistrictPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const appliedFilters = useMemo(() => districtFiltersFromParams(searchParams), [searchParams]);
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

  const noSnapshotsInRange = useMemo(
    () =>
      snapshotsData?.items
        ? hasActiveDateRangeWithNoSnapshots(snapshotsData.items, dateFilterInput)
        : false,
    [snapshotsData?.items, dateFilterInput],
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
    if (noSnapshotsInRange) return;

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
    noSnapshotsInRange,
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

  const displayRows = useMemo(() => {
    if (!snapshotId || noSnapshotsInRange || !rowsData?.rows) return [];
    const aggregated = aggregateDistrictRowsByDmo(
      rowsData.rows,
      appliedFilters.operator,
      appliedFilters.minerals,
    );
    const filtered = applyDistrictFilters(aggregated, {
      minerals: appliedFilters.minerals,
      districts: appliedFilters.districts,
      hideZeroPasses: appliedFilters.hideZeroPasses,
    });
    return sortDistrictRows(filtered, sortKey, sortDir);
  }, [rowsData?.rows, appliedFilters, sortKey, sortDir, snapshotId, noSnapshotsInRange]);

  const handleApplyFilters = useCallback(
    (next: DistrictFilterValues) => {
      const patch = districtParamsFromFilters(next, sortKey, sortDir);
      updateParams(patch);
    },
    [sortKey, sortDir, updateParams],
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
  const snapshotResolving = isSnapshotResolving(snapshotsLoaded, snapshotId, noSnapshotsInRange);
  const pageLoading = snapshotsLoading || snapshotResolving || (Boolean(snapshotId) && rowsLoading);
  const isError = snapshotsError || rowsError;
  const refetch = () => {
    void refetchSnapshots();
    if (snapshotId) void refetchRows();
  };

  if (isError) {
    return (
      <Card className="border-red-500/30">
        <p className="text-sm font-semibold text-red-400">Unable to load data</p>
        <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
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

      {noSnapshotsInRange ? (
        <EmptyStateCard message="No data available" />
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
