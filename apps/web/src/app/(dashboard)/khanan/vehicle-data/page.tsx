'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChalaanEpassFilters } from '@/components/khanan/ChalaanEpassFilters';
import { VehicleDataTable } from '@/components/khanan/VehicleDataTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import {
  EPASS_SNAPSHOTS_QUERY_KEY,
  fetchEpassSnapshots,
  fetchLatestEpass,
  fetchSnapshotDistrictRows,
  fetchVehicleDataList,
} from '@/lib/epass';
import { serializeEpassFilterParams } from '@/lib/epass-filter-params';
import {
  hasActiveDateRangeWithNoSnapshots,
  resolveSnapshotIdForDateFilters,
  snapshotsForDateMode,
} from '@/lib/epass-report-date';
import {
  parseVehicleDataFilters,
  parseVehicleDataSortDir,
  parseVehicleDataSortKey,
  toVehicleDataDetailQueryParams,
  toVehicleDataListQueryParams,
} from '@/lib/epass-vehicle-data-view';
import type {
  EpassBrowseFilterValues,
  EpassSnapshotDto,
  VehicleDataSortDir,
  VehicleDataSortKey,
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

function useVehicleDataSortHandlers(searchParams: URLSearchParams) {
  const router = useRouter();
  const sortKey = parseVehicleDataSortKey(searchParams.get('sort')) ?? 'vehicle';
  const sortDir: VehicleDataSortDir = parseVehicleDataSortDir(searchParams.get('dir'));

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/vehicle-data?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleSort = useCallback(
    (key: VehicleDataSortKey) => {
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

  return { sortKey, sortDir, updateParams, handleSort };
}

function VehicleDataPageContent() {
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(() => parseVehicleDataFilters(searchParams), [searchParams]);
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const pageSize = Math.max(Number(searchParams.get('limit') || String(PAGE_SIZE)), 10);
  const { sortKey, sortDir, updateParams, handleSort } = useVehicleDataSortHandlers(searchParams);
  const [vehicleSearchDraft, setVehicleSearchDraft] = useState(appliedFilters.vehicleSearch);

  useEffect(() => {
    setVehicleSearchDraft(appliedFilters.vehicleSearch);
  }, [appliedFilters.vehicleSearch]);

  const {
    data: snapshotsData,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
    refetch: refetchSnapshots,
  } = useQuery({
    queryKey: EPASS_SNAPSHOTS_QUERY_KEY,
    queryFn: () => fetchEpassSnapshots(),
    staleTime: SNAPSHOTS_STALE_MS,
  });

  const dateFilterInput = useMemo(
    () => ({
      dateMode: appliedFilters.epass.dateMode,
      dateFrom: appliedFilters.epass.dateFrom,
      dateTo: appliedFilters.epass.dateTo,
      snapshotId: appliedFilters.epass.snapshotId,
    }),
    [appliedFilters.epass],
  );

  const snapshotId = useMemo(() => {
    if (!snapshotsData?.items.length) return appliedFilters.epass.snapshotId || null;
    return resolveSnapshotIdForDateFilters(snapshotsData.items, dateFilterInput);
  }, [snapshotsData?.items, dateFilterInput, appliedFilters.epass.snapshotId]);

  const noSnapshotsInRange = useMemo(
    () =>
      snapshotsData?.items
        ? hasActiveDateRangeWithNoSnapshots(snapshotsData.items, dateFilterInput)
        : false,
    [snapshotsData?.items, dateFilterInput],
  );

  useEffect(() => {
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (snapshotId) return;
    if (noSnapshotsInRange) return;

    if (
      appliedFilters.epass.dateMode === 'range' &&
      (appliedFilters.epass.dateFrom || appliedFilters.epass.dateTo)
    ) {
      const inRange = snapshotsForDateMode(
        snapshotsData.items,
        appliedFilters.epass.dateMode,
        appliedFilters.epass.dateFrom,
        appliedFilters.epass.dateTo,
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
    appliedFilters.epass.dateMode,
    appliedFilters.epass.dateFrom,
    appliedFilters.epass.dateTo,
  ]);

  useEffect(() => {
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (!appliedFilters.epass.snapshotId) return;
    if (snapshotId === appliedFilters.epass.snapshotId) return;
    updateParams({
      snapshotId: snapshotId,
      reportDate: snapshotId
        ? (snapshotsData.items.find((s) => s.id === snapshotId)?.reportDate ?? null)
        : null,
    });
  }, [snapshotId, appliedFilters.epass.snapshotId, snapshotsLoading, snapshotsData, updateParams]);

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', snapshotId, 'vehicle-data-filters'],
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
    () =>
      toVehicleDataListQueryParams(appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize),
    [appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize],
  );

  const detailQueryParams = useMemo(
    () => toVehicleDataDetailQueryParams(appliedFilters, snapshotId),
    [appliedFilters, snapshotId],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['epass', 'vehicle-data', listParams],
    queryFn: () => fetchVehicleDataList(listParams),
    enabled: Boolean(snapshotId) && !noSnapshotsInRange,
  });

  const snapshot = snapshotFromList(data?.snapshot ?? null);
  const total = data?.total ?? 0;

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving = isSnapshotResolving(snapshotsLoaded, snapshotId, noSnapshotsInRange);
  const pageLoading = snapshotsLoading || snapshotResolving || (Boolean(snapshotId) && isLoading);

  const handleApplyEpassFilters = useCallback(
    (epass: EpassBrowseFilterValues) => {
      updateParams({
        ...serializeEpassFilterParams({ ...epass, consignerRowId: '' }),
        q: vehicleSearchDraft.trim() || null,
        sort: sortKey,
        dir: sortKey ? sortDir : null,
        offset: '0',
      });
    },
    [updateParams, vehicleSearchDraft, sortKey, sortDir],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      ...serializeEpassFilterParams({
        operator: 'all',
        minerals: [],
        dateMode: 'specific',
        dateFrom: '',
        dateTo: '',
        reportDate: appliedFilters.epass.reportDate,
        snapshotId: snapshotId ?? '',
        districts: [],
        consignerSearch: '',
        hideZeroChallans: false,
        consigneeSearch: '',
        hideZeroPasses: false,
        consignerRowId: '',
      }),
      q: null,
      sort: null,
      dir: null,
      offset: '0',
    });
    setVehicleSearchDraft('');
  }, [updateParams, appliedFilters.epass.reportDate, snapshotId]);

  const applyVehicleSearch = useCallback(() => {
    updateParams({
      q: vehicleSearchDraft.trim() || null,
      offset: '0',
    });
  }, [updateParams, vehicleSearchDraft]);

  if (snapshotsError || isError) {
    return (
      <PageStack>
        <Card className="border-red-500/30">
          <p className="text-sm font-semibold text-red-400">Unable to load data</p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              void refetchSnapshots();
              void refetch();
            }}
          >
            Retry
          </Button>
        </Card>
      </PageStack>
    );
  }

  if (pageLoading) {
    return <EpassBrowsePageLoading />;
  }

  return (
    <PageStack>
      <EpassReportMetaBar snapshot={snapshot} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Vehicle reg no
          </span>
          <input
            type="search"
            value={vehicleSearchDraft}
            onChange={(e) => setVehicleSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyVehicleSearch();
            }}
            className="min-h-11 rounded-xl border border-border-default bg-surface-deep px-3 text-sm text-white placeholder:text-text-secondary/50"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <Button type="button" variant="secondary" className="shrink-0" onClick={applyVehicleSearch}>
          Search
        </Button>
      </div>
      <ChalaanEpassFilters
        snapshots={snapshotsData?.items ?? []}
        minerals={minerals}
        districts={districts}
        values={{ ...appliedFilters.epass, consignerRowId: '' }}
        onApply={handleApplyEpassFilters}
        onClear={handleClearFilters}
      />

      {noSnapshotsInRange ? (
        <Card>
          <p className="text-sm text-text-secondary">No data available</p>
        </Card>
      ) : data ? (
        <>
          <VehicleDataTable
            rows={data.items}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            detailQueryParams={detailQueryParams}
          />
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

export default function VehicleDataPage() {
  return (
    <Suspense fallback={<EpassBrowsePageSkeleton />}>
      <VehicleDataPageContent />
    </Suspense>
  );
}
