'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChalaanEpassFilters } from '@/components/khanan/ChalaanEpassFilters';
import type { ConsigneeEpassFilterExtras } from '@/components/khanan/ConsigneeEpassFilters';
import { VehicleDataTable } from '@/components/khanan/VehicleDataTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { EpassBrowsePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { Button } from '@/components/ui/Button';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { getEpassBrowseEmptyState, isEpassBrowseEmpty } from '@/lib/epass-empty-state';
import { useStaleEpassSnapshotParams } from '@/hooks/useStaleEpassSnapshotParams';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import {
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  fetchEpassFilterOptions,
  fetchEpassSnapshotReportDates,
  fetchLatestEpass,
  fetchSnapshotDistrictRows,
  fetchVehicleDataList,
} from '@/lib/epass';
import { serializeEpassFilterParams } from '@/lib/epass-filter-params';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
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

function useVehicleDataSortHandlers(
  searchParams: URLSearchParams,
  reportScope: 'all' | 'specific',
) {
  const router = useRouter();
  const defaultSort: VehicleDataSortKey = reportScope === 'all' ? 'lastDate' : 'vehicle';
  const defaultDir: VehicleDataSortDir = reportScope === 'all' ? 'desc' : 'asc';
  const sortKey = parseVehicleDataSortKey(searchParams.get('sort')) ?? defaultSort;
  const sortDir: VehicleDataSortDir = searchParams.has('dir')
    ? parseVehicleDataSortDir(searchParams.get('dir'))
    : searchParams.has('sort')
      ? parseVehicleDataSortDir(searchParams.get('dir'))
      : defaultDir;

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
  const isAllReports = appliedFilters.reportScope === 'all';
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const pageSize = Math.max(Number(searchParams.get('limit') || String(PAGE_SIZE)), 10);
  const { sortKey, sortDir, updateParams, handleSort } = useVehicleDataSortHandlers(
    searchParams,
    appliedFilters.reportScope,
  );
  const [vehicleSearchDraft, setVehicleSearchDraft] = useState(appliedFilters.vehicleSearch);

  useEffect(() => {
    setVehicleSearchDraft(appliedFilters.vehicleSearch);
  }, [appliedFilters.vehicleSearch]);

  useEffect(() => {
    const hasScope = searchParams.has('reportScope');
    const hasSnapshot = searchParams.has('snapshotId');
    if (!hasScope && !hasSnapshot) {
      updateParams({
        reportScope: 'all',
        sort: searchParams.has('sort') ? null : 'lastDate',
        dir: searchParams.has('dir') ? null : 'desc',
      });
    }
  }, [searchParams, updateParams]);

  const {
    data: snapshotsData,
    isLoading: snapshotsLoading,
    isError: snapshotsError,
    refetch: refetchSnapshots,
  } = useQuery({
    queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
    queryFn: () => fetchEpassSnapshotReportDates(),
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
    if (isAllReports) return null;
    if (!snapshotsData?.items.length) return appliedFilters.epass.snapshotId || null;
    return resolveSnapshotIdForDateFilters(snapshotsData.items, dateFilterInput);
  }, [isAllReports, snapshotsData?.items, dateFilterInput, appliedFilters.epass.snapshotId]);

  const browseEmpty = useMemo(
    () => isEpassBrowseEmpty(snapshotsData?.items, dateFilterInput),
    [snapshotsData?.items, dateFilterInput],
  );

  const browseEmptyState = useMemo(
    () => getEpassBrowseEmptyState(snapshotsData?.items, dateFilterInput),
    [snapshotsData?.items, dateFilterInput],
  );

  useStaleEpassSnapshotParams(
    Boolean(snapshotsData) && !snapshotsLoading && !isAllReports,
    snapshotsData?.items.length ?? 0,
    appliedFilters.epass.snapshotId || null,
    appliedFilters.epass.reportDate || null,
    updateParams,
  );

  useEffect(() => {
    if (isAllReports) return;
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (snapshotId) return;
    if (browseEmpty) return;

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
        updateParams({ snapshotId: pick.id, reportDate: pick.reportDate, reportScope: null });
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
            reportScope: null,
          });
        }
      } catch {
        const first = snapshotsData.items[0];
        if (first) {
          updateParams({
            snapshotId: first.id,
            reportDate: first.reportDate,
            reportScope: null,
          });
        }
      }
    };

    void bootstrap();
  }, [
    isAllReports,
    snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
    browseEmpty,
    appliedFilters.epass.dateMode,
    appliedFilters.epass.dateFrom,
    appliedFilters.epass.dateTo,
  ]);

  useEffect(() => {
    if (isAllReports) return;
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (!appliedFilters.epass.snapshotId) return;
    if (snapshotId === appliedFilters.epass.snapshotId) return;
    updateParams({
      snapshotId: snapshotId,
      reportDate: snapshotId
        ? (snapshotsData.items.find((s) => s.id === snapshotId)?.reportDate ?? null)
        : null,
    });
  }, [
    isAllReports,
    snapshotId,
    appliedFilters.epass.snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
  ]);

  const filterOptionsParams = useMemo(
    () => ({
      reportScope: 'all' as const,
      dateMode: appliedFilters.epass.dateMode === 'range' ? ('range' as const) : undefined,
      dateFrom: appliedFilters.epass.dateFrom || undefined,
      dateTo: appliedFilters.epass.dateTo || undefined,
    }),
    [appliedFilters.epass],
  );

  const { data: allFilterOptions } = useQuery({
    queryKey: ['epass', 'filter-options', filterOptionsParams],
    queryFn: () => fetchEpassFilterOptions(filterOptionsParams),
    enabled: isAllReports && Boolean(snapshotsData?.items.length),
    staleTime: SNAPSHOTS_STALE_MS,
  });

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', snapshotId, 'vehicle-data-filters'],
    queryFn: () => {
      if (!snapshotId) throw new Error('Snapshot required');
      return fetchSnapshotDistrictRows(snapshotId);
    },
    enabled: Boolean(snapshotId) && !isAllReports,
  });

  const minerals = useMemo(() => {
    if (isAllReports) return allFilterOptions?.minerals ?? [];
    return districtRowsData?.rows ? collectMinerals(districtRowsData.rows) : [];
  }, [isAllReports, allFilterOptions?.minerals, districtRowsData?.rows]);

  const districts = useMemo(() => {
    if (isAllReports) return allFilterOptions?.districts ?? [];
    return districtRowsData?.rows ? collectDistricts(districtRowsData.rows) : [];
  }, [isAllReports, allFilterOptions?.districts, districtRowsData?.rows]);

  const listParams = useMemo(
    () =>
      toVehicleDataListQueryParams(appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize),
    [appliedFilters, snapshotId, sortKey, sortDir, offset, pageSize],
  );

  const detailQueryParams = useMemo(
    () => toVehicleDataDetailQueryParams(appliedFilters, snapshotId),
    [appliedFilters, snapshotId],
  );

  const hasSnapshots = Boolean(snapshotsData?.items.length);
  const listEnabled = isAllReports ? hasSnapshots : Boolean(snapshotId) && !browseEmpty;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['epass', 'vehicle-data', listParams],
    queryFn: () => fetchVehicleDataList(listParams),
    enabled: listEnabled,
  });

  const snapshot = snapshotFromList(data?.snapshot ?? null);
  const total = data?.total ?? 0;

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving =
    !isAllReports && isSnapshotResolving(snapshotsLoaded, snapshotId, browseEmpty);
  const pageLoading = snapshotsLoading || snapshotResolving || (listEnabled && isLoading);

  const handleApplyEpassFilters = useCallback(
    (epass: EpassBrowseFilterValues, extras?: ConsigneeEpassFilterExtras) => {
      const nextReportScope = extras?.reportScope ?? appliedFilters.reportScope;
      updateParams({
        ...serializeEpassFilterParams({ ...epass, consignerRowId: '' }),
        reportScope: nextReportScope === 'all' ? 'all' : null,
        snapshotId: nextReportScope === 'all' ? null : epass.snapshotId || null,
        reportDate: nextReportScope === 'all' ? null : epass.reportDate || null,
        portalStatus:
          extras?.portalStatus && extras.portalStatus !== 'all' ? extras.portalStatus : null,
        q: vehicleSearchDraft.trim() || null,
        sort: sortKey,
        dir: sortKey ? sortDir : null,
        offset: '0',
      });
    },
    [updateParams, vehicleSearchDraft, sortKey, sortDir, appliedFilters.reportScope],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      ...serializeEpassFilterParams({
        operator: 'all',
        minerals: [],
        dateMode: 'specific',
        dateFrom: '',
        dateTo: '',
        reportDate: '',
        snapshotId: '',
        districts: [],
        consignerSearch: '',
        hideZeroChallans: false,
        consigneeSearch: '',
        hideZeroPasses: false,
        consignerRowId: '',
        destination: '',
        challanSearch: '',
      }),
      reportScope: 'all',
      portalStatus: null,
      q: null,
      sort: 'lastDate',
      dir: 'desc',
      offset: '0',
    });
    setVehicleSearchDraft('');
  }, [updateParams]);

  const applyVehicleSearch = useCallback(() => {
    updateParams({
      q: vehicleSearchDraft.trim() || null,
      offset: '0',
    });
  }, [updateParams, vehicleSearchDraft]);

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
      <EpassReportMetaBar
        snapshot={snapshot}
        reportScope={data?.reportScope}
        snapshotCount={data?.snapshotCount}
        latestScrapedAt={allFilterOptions?.latestScrapedAt ?? snapshotsData?.items[0]?.scrapedAt}
      />

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
        allowAllReports
        reportScope={appliedFilters.reportScope}
        showPortalStatusFilter
        portalStatus={appliedFilters.portalStatus}
      />

      {!isAllReports && browseEmpty ? (
        <EpassEmptyState {...browseEmptyState} />
      ) : data ? (
        <>
          <VehicleDataTable
            rows={data.items}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            detailQueryParams={detailQueryParams}
          />
          {data.items.some(
            (r) =>
              (r.mcvPortalStatus ?? (r.hasVehicleStatus ? 'on_portal' : 'not_checked')) !==
              'on_portal',
          ) ? (
            <p className="text-xs text-text-secondary">
              Portal status: <strong className="font-medium text-white">On portal</strong> = MCV
              data found;{' '}
              <strong className="font-medium text-amber-200/90">No data on portal</strong> = scrape
              ran but portal had no status;{' '}
              <strong className="font-medium text-text-secondary">Not checked</strong> = not scraped
              yet. GVW/Unladen use portal weights when available.
            </p>
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

export default function VehicleDataPage() {
  return (
    <Suspense fallback={<EpassBrowsePageSkeleton />}>
      <VehicleDataPageContent />
    </Suspense>
  );
}
