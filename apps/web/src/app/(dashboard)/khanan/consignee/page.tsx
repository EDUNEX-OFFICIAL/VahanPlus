'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConsigneeEpassFilters } from '@/components/khanan/ConsigneeEpassFilters';
import { ConsignerCombobox } from '@/components/khanan/ConsignerCombobox';
import { ConsigneeTable } from '@/components/khanan/ConsigneeTable';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { getToken } from '@/lib/auth';
import { formatOperatorType } from '@/lib/operator';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import {
  applyConsigneeFilters,
  sortConsigneeRows,
} from '@/lib/epass-consignee-view';
import {
  buildChalaanHref,
  parseEpassFilterParams,
  serializeEpassFilterParams,
  toConsignerChallansQueryParams,
  toConsignerOptionsQueryParams,
} from '@/lib/epass-filter-params';
import {
  EPASS_SNAPSHOTS_QUERY_KEY,
  fetchConsignerChallans,
  fetchConsignerOptions,
  fetchEpassSnapshots,
  fetchLatestEpass,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import {
  hasActiveDateRangeWithNoSnapshots,
  resolveSnapshotIdForDateFilters,
  snapshotsForDateMode,
} from '@/lib/epass-report-date';
import type {
  ConsigneeSortDir,
  ConsigneeSortKey,
  EpassSnapshotDto,
  EpassSnapshotListItemDto,
} from '@/lib/epass-types';

const SNAPSHOTS_STALE_MS = 5 * 60 * 1000;

function snapshotFromListItem(snap: EpassSnapshotListItemDto): EpassSnapshotDto {
  return {
    id: snap.id,
    reportDate: snap.reportDate,
    reportGeneratedOn: snap.reportGeneratedOn,
    scrapedAt: snap.scrapedAt,
    rowCount: snap.rowCount,
    jobId: snap.jobId,
  };
}

function ConsigneePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(() => parseEpassFilterParams(searchParams), [searchParams]);
  const consignerRowId = appliedFilters.consignerRowId;

  const [sortKey, setSortKey] = useState<ConsigneeSortKey | null>(null);
  const [sortDir, setSortDir] = useState<ConsigneeSortDir>('asc');

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/consignee?${next.toString()}`);
    },
    [router, searchParams],
  );

  const dateFilterInput = useMemo(
    () => ({
      dateMode: appliedFilters.dateMode,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      snapshotId: appliedFilters.snapshotId,
    }),
    [appliedFilters],
  );

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

  const resolvedSnapshotId = useMemo(() => {
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
    if (resolvedSnapshotId) return;
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
    snapshotsLoading,
    snapshotsData,
    resolvedSnapshotId,
    noSnapshotsInRange,
    updateParams,
    appliedFilters.dateMode,
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
  ]);

  useEffect(() => {
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (!appliedFilters.snapshotId) return;
    if (resolvedSnapshotId === appliedFilters.snapshotId) return;
    updateParams({
      snapshotId: resolvedSnapshotId,
      reportDate: resolvedSnapshotId
        ? snapshotsData.items.find((s) => s.id === resolvedSnapshotId)?.reportDate ?? null
        : null,
      consignerRowId: resolvedSnapshotId ? consignerRowId : null,
    });
  }, [
    resolvedSnapshotId,
    appliedFilters.snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
    consignerRowId,
  ]);

  const optionsQuery = useQuery({
    queryKey: [
      'epass',
      'consigner-options',
      resolvedSnapshotId,
      appliedFilters,
    ],
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchConsignerOptions(
        token,
        toConsignerOptionsQueryParams(appliedFilters, resolvedSnapshotId),
      );
    },
    enabled: Boolean(resolvedSnapshotId) && !noSnapshotsInRange,
  });

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', resolvedSnapshotId, 'consignee-filters'],
    queryFn: () => {
      const token = getToken();
      if (!token || !resolvedSnapshotId) throw new Error('Not authenticated');
      return fetchSnapshotDistrictRows(token, resolvedSnapshotId);
    },
    enabled: Boolean(resolvedSnapshotId),
  });

  const minerals = useMemo(
    () => (districtRowsData?.rows ? collectMinerals(districtRowsData.rows) : []),
    [districtRowsData?.rows],
  );

  const districts = useMemo(
    () => (districtRowsData?.rows ? collectDistricts(districtRowsData.rows) : []),
    [districtRowsData?.rows],
  );

  const challansQuery = useQuery({
    queryKey: ['epass', 'challans', consignerRowId, appliedFilters],
    enabled: Boolean(consignerRowId) && !noSnapshotsInRange,
    queryFn: () => {
      const token = getToken();
      if (!token || !consignerRowId) throw new Error('Not authenticated');
      return fetchConsignerChallans(
        token,
        consignerRowId,
        toConsignerChallansQueryParams(appliedFilters),
      );
    },
  });

  const displayRows = useMemo(() => {
    if (!challansQuery.data?.items) return [];
    const filtered = applyConsigneeFilters(challansQuery.data.items, {
      consigneeSearch: appliedFilters.consigneeSearch,
      hideZeroPasses: appliedFilters.hideZeroPasses,
      dateFrom:
        appliedFilters.dateMode === 'range' ? appliedFilters.dateFrom : undefined,
      dateTo:
        appliedFilters.dateMode === 'range'
          ? appliedFilters.dateTo || appliedFilters.dateFrom
          : undefined,
    });
    return sortConsigneeRows(filtered, sortKey, sortDir);
  }, [challansQuery.data?.items, appliedFilters, sortKey, sortDir]);

  const handleApplyFilters = useCallback(
    (next: typeof appliedFilters) => {
      updateParams(serializeEpassFilterParams(next));
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    const latest = snapshotsData?.items[0];
    updateParams({
      operator: null,
      role: null,
      mineral: null,
      dateMode: null,
      dateFrom: null,
      dateTo: null,
      district: null,
      consigner: null,
      consignee: null,
      hideZeroChallans: null,
      hideZeroPasses: null,
      consignerRowId: null,
      snapshotId: latest?.id ?? null,
      reportDate: latest?.reportDate ?? null,
    });
  }, [snapshotsData, updateParams]);

  // Clear consigner only when it no longer matches filtered options (no auto-select)
  useEffect(() => {
    if (noSnapshotsInRange || optionsQuery.isFetching || !optionsQuery.data || !consignerRowId) {
      return;
    }

    const isValid = optionsQuery.data.items.some((o) => o.id === consignerRowId);
    if (!isValid) {
      updateParams(serializeEpassFilterParams({ ...appliedFilters, consignerRowId: '' }));
    }
  }, [
    optionsQuery.data,
    optionsQuery.isFetching,
    noSnapshotsInRange,
    consignerRowId,
    appliedFilters,
    updateParams,
  ]);

  const handleSort = useCallback((key: ConsigneeSortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') {
      setSortDir('desc');
      return;
    }
    setSortKey(null);
    setSortDir('asc');
  }, [sortKey, sortDir]);

  const handleConsignerChange = useCallback(
    (id: string) => {
      const patch = serializeEpassFilterParams({
        ...appliedFilters,
        consignerRowId: id,
      });
      updateParams(patch);
    },
    [appliedFilters, updateParams],
  );

  const metaSnapshot = useMemo(() => {
    if (!resolvedSnapshotId || !snapshotsData?.items.length) return null;
    const snap = snapshotsData.items.find((s) => s.id === resolvedSnapshotId);
    return snap ? snapshotFromListItem(snap) : null;
  }, [resolvedSnapshotId, snapshotsData?.items]);

  const isLoadingAll =
    snapshotsLoading || (Boolean(resolvedSnapshotId) && optionsQuery.isLoading);

  return (
    <div className="animate-slide-right space-y-6">
      {isLoadingAll ? (
        <Card className="animate-pulse">
          <div className="h-4 w-32 rounded bg-surface-deep" />
          <div className="mt-4 h-6 w-64 rounded bg-surface-deep" />
        </Card>
      ) : metaSnapshot ? (
        <EpassReportMetaBar snapshot={metaSnapshot} />
      ) : null}

      {!snapshotsLoading && snapshotsData ? (
        <ConsigneeEpassFilters
          snapshots={snapshotsData.items}
          minerals={minerals}
          districts={districts}
          values={appliedFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      ) : null}

      {noSnapshotsInRange ? (
        <Card>
          <p className="text-sm text-text-secondary">No data available</p>
        </Card>
      ) : (
        <Card className="p-4">
          <ConsignerCombobox
            options={optionsQuery.data?.items ?? []}
            value={consignerRowId}
            onChange={handleConsignerChange}
            loading={optionsQuery.isLoading}
          />
        </Card>
      )}

      {snapshotsError || optionsQuery.isError ? (
        <Card className="border-red-500/30">
          <p className="text-sm font-semibold text-red-400">Unable to load data</p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              void refetchSnapshots();
              void optionsQuery.refetch();
            }}
          >
            Retry
          </Button>
        </Card>
      ) : null}

      {!noSnapshotsInRange &&
      !consignerRowId &&
      (optionsQuery.data?.items.length ?? 0) === 0 &&
      !optionsQuery.isLoading ? (
        <Card>
          <p className="text-sm text-text-secondary">No consigners found</p>
        </Card>
      ) : null}

      {!noSnapshotsInRange &&
      !consignerRowId &&
      (optionsQuery.data?.items.length ?? 0) > 0 &&
      !optionsQuery.isLoading ? (
        <Card>
          <p className="text-sm text-text-secondary">No data available</p>
        </Card>
      ) : null}

      {consignerRowId ? (
        <>
          {challansQuery.isLoading ? (
            <Card className="animate-pulse p-12">
              <div className="h-48 rounded bg-surface-deep" />
            </Card>
          ) : null}

          {challansQuery.isError ? (
            <Card className="border-red-500/30">
              <p className="text-sm font-semibold text-red-400">Unable to load data</p>
              <Button className="mt-4" variant="secondary" onClick={() => challansQuery.refetch()}>
                Retry
              </Button>
            </Card>
          ) : null}

          {challansQuery.data ? (
            <>
              <h2 className="text-xl font-semibold text-white">
                {challansQuery.data.consigner.consignerName}
                <span className="ml-2 text-sm font-normal text-text-secondary">
                  {challansQuery.data.districtRow.dmoName} ·{' '}
                  {formatOperatorType(
                    challansQuery.data.consigner.operatorType ??
                      challansQuery.data.consigner.role,
                  )}
                </span>
              </h2>
              {displayRows.length > 0 ? (
                <p className="text-xs text-text-secondary tabular-nums">
                  Showing {displayRows.length} line{displayRows.length === 1 ? '' : 's'}
                  {appliedFilters.dateMode === 'range' ? ' in date range' : ''}
                </p>
              ) : null}
              {displayRows.length === 0 ? (
                <Card>
                  <p className="text-sm text-text-secondary">No consignee lines found</p>
                </Card>
              ) : (
                <ConsigneeTable
                  rows={displayRows}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  getChalaanHref={
                  challansQuery.data
                    ? (row) =>
                        row.challanCount > 0
                          ? buildChalaanHref(searchParams, {
                              district: challansQuery.data!.districtRow.dmoName,
                              consigner: challansQuery.data!.consigner.consignerName,
                              consignee: row.consigneeName,
                              snapshotId:
                                appliedFilters.dateMode !== 'range'
                                  ? resolvedSnapshotId ?? null
                                  : null,
                            })
                          : null
                    : undefined
                  }
                />
              )}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function ConsigneePage() {
  return (
    <Suspense
      fallback={
        <Card className="animate-pulse p-12">
          <div className="h-8 w-64 rounded bg-surface-deep" />
        </Card>
      }
    >
      <ConsigneePageContent />
    </Suspense>
  );
}
