'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChalaanEpassFilters } from '@/components/khanan/ChalaanEpassFilters';
import { ChalaanTable } from '@/components/khanan/ChalaanTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { getToken } from '@/lib/auth';
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
import {
  hasActiveDateRangeWithNoSnapshots,
  resolveSnapshotIdForDateFilters,
  snapshotsForDateMode,
} from '@/lib/epass-report-date';
import type { ChalaanSortDir, ChalaanSortKey, EpassBrowseFilterValues, EpassSnapshotDto } from '@/lib/epass-types';

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
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchEpassSnapshots(token);
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
      const token = getToken();
      if (!token) return;
      try {
        const latest = await fetchLatestEpass(token);
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
        ? snapshotsData.items.find((s) => s.id === snapshotId)?.reportDate ?? null
        : null,
    });
  }, [
    snapshotId,
    appliedFilters.snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
  ]);

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', snapshotId, 'chalaan-filters'],
    queryFn: () => {
      const token = getToken();
      if (!token || !snapshotId) throw new Error('Not authenticated');
      return fetchSnapshotDistrictRows(token, snapshotId);
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
    () => toChalaanListQueryParams(appliedFilters, snapshotId, sortKey, sortDir, offset, PAGE_SIZE),
    [appliedFilters, snapshotId, sortKey, sortDir, offset],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['epass', 'chalaan-pass-list', listParams],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchChalaanPassList(token, listParams);
    },
    enabled: Boolean(snapshotId) && !noSnapshotsInRange,
  });

  const snapshot = snapshotFromList(data?.snapshot ?? null);
  const total = data?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

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
      }),
      sort: null,
      dir: null,
      offset: '0',
    });
  }, [updateParams, appliedFilters.reportDate, snapshotId]);

  return (
    <div className="animate-slide-right space-y-6">
      <EpassReportMetaBar snapshot={snapshot} />

      {snapshotsError ? (
        <Card className="border-red-500/30">
          <p className="text-sm font-semibold text-red-400">Unable to load data</p>
          <Button className="mt-4" variant="secondary" onClick={() => refetchSnapshots()}>
            Retry
          </Button>
        </Card>
      ) : (
        <ChalaanEpassFilters
          snapshots={snapshotsData?.items ?? []}
          minerals={minerals}
          districts={districts}
          values={{ ...appliedFilters, consignerRowId: '' }}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      )}

      {noSnapshotsInRange ? (
        <Card>
          <p className="text-sm text-text-secondary">No data available</p>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="animate-pulse p-12">
          <div className="h-48 rounded bg-surface-deep" />
        </Card>
      ) : null}

      {isError ? (
        <Card className="border-red-500/30">
          <p className="text-sm font-semibold text-red-400">Unable to load data</p>
          <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {!isLoading && !isError && data ? (
        <>
          {data.items.length === 0 ? (
            <Card>
              <p className="text-sm text-text-secondary">No challan lines found</p>
            </Card>
          ) : (
            <>
              <p className="text-sm text-text-secondary tabular-nums">
                {pageStart}–{pageEnd} of {total}
              </p>
              <ChalaanTable
                rows={data.items}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  className="min-h-8 px-3 py-1 text-xs"
                  disabled={offset <= 0}
                  onClick={() =>
                    updateParams({ offset: String(Math.max(0, offset - PAGE_SIZE)) })
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-8 px-3 py-1 text-xs"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => updateParams({ offset: String(offset + PAGE_SIZE) })}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

export default function ChalaanPage() {
  return (
    <Suspense
      fallback={
        <Card className="animate-pulse p-12">
          <div className="h-8 w-64 rounded bg-surface-deep" />
        </Card>
      }
    >
      <ChalaanPageContent />
    </Suspense>
  );
}
