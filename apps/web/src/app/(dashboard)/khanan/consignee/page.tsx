'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { getEpassBrowseEmptyState, isEpassBrowseEmpty } from '@/lib/epass-empty-state';
import { useStaleEpassSnapshotParams } from '@/hooks/useStaleEpassSnapshotParams';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { ConsigneeEpassFilters } from '@/components/khanan/ConsigneeEpassFilters';
import { ConsignerCombobox } from '@/components/khanan/ConsignerCombobox';
import { ConsigneeTable } from '@/components/khanan/ConsigneeTable';
import { IncompleteScrapeBanner } from '@/components/khanan/IncompleteScrapeBanner';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { ConsigneePageLoading, EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { formatOperatorType } from '@/lib/operator';
import { collectDistricts, collectMinerals } from '@/lib/epass-district-view';
import { applyConsigneeFilters, sortConsigneeRows } from '@/lib/epass-consignee-view';
import { normalizeConsigneeFilterQuery } from '@/lib/epass-query-normalize';
import {
  buildChalaanHref,
  parseEpassFilterParams,
  serializeEpassFilterParams,
  toConsignerChallansQueryParams,
  toConsignerOptionsQueryParams,
} from '@/lib/epass-filter-params';
import {
  EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
  fetchConsignerChallans,
  fetchConsignerOptions,
  fetchEpassFilterOptions,
  fetchEpassSnapshotReportDates,
  fetchSnapshotDistrictRows,
} from '@/lib/epass';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import { allReportsBootstrapPatch, allReportsClearPatch } from '@/lib/epass-report-scope';
import type { ConsigneeEpassFilterExtras } from '@/components/khanan/ConsigneeEpassFilters';
import type {
  ConsigneeSortDir,
  ConsigneeSortKey,
  EpassSnapshotDto,
  EpassSnapshotReportDateItemDto,
} from '@/lib/epass-types';

const SNAPSHOTS_STALE_MS = 5 * 60 * 1000;

function snapshotFromListItem(snap: EpassSnapshotReportDateItemDto): EpassSnapshotDto {
  return {
    id: snap.id,
    reportDate: snap.reportDate,
    reportGeneratedOn: '',
    scrapedAt: snap.scrapedAt,
    rowCount: 0,
    jobId: null,
  };
}

function ConsigneePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedFilters = useMemo(() => parseEpassFilterParams(searchParams), [searchParams]);
  const isAllReports = appliedFilters.reportScope === 'all';
  const consignerRowId = appliedFilters.consignerRowId;

  const [sortKey, setSortKey] = useState<ConsigneeSortKey | null>(null);
  const [sortDir, setSortDir] = useState<ConsigneeSortDir>('asc');
  const [consignerListOpen, setConsignerListOpen] = useState(false);

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
    queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
    queryFn: () => {
      return fetchEpassSnapshotReportDates();
    },
    staleTime: SNAPSHOTS_STALE_MS,
  });

  const resolvedSnapshotId = useMemo(() => {
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

  const isRangeMode =
    appliedFilters.dateMode === 'range' &&
    Boolean(appliedFilters.dateFrom || appliedFilters.dateTo);

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
    isAllReports,
  );

  useEffect(() => {
    const hasScope = searchParams.has('reportScope');
    const hasSnapshot = searchParams.has('snapshotId');
    if (!hasScope && !hasSnapshot && !isRangeMode) {
      updateParams(allReportsBootstrapPatch());
    }
  }, [searchParams, updateParams, isRangeMode]);

  useEffect(() => {
    if (isAllReports) return;
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (resolvedSnapshotId) return;
    if (browseEmpty) return;
    if (isRangeMode) return;
  }, [isAllReports, snapshotsLoading, snapshotsData, resolvedSnapshotId, browseEmpty, isRangeMode]);

  useEffect(() => {
    if (isAllReports) return;
    if (isRangeMode) return;
    if (snapshotsLoading || !snapshotsData?.items.length) return;
    if (!appliedFilters.snapshotId) return;
    if (resolvedSnapshotId === appliedFilters.snapshotId) return;
    updateParams({
      snapshotId: resolvedSnapshotId,
      reportDate: resolvedSnapshotId
        ? (snapshotsData.items.find((s) => s.id === resolvedSnapshotId)?.reportDate ?? null)
        : null,
      consignerRowId: resolvedSnapshotId ? consignerRowId : null,
      reportScope: null,
    });
  }, [
    isAllReports,
    resolvedSnapshotId,
    appliedFilters.snapshotId,
    snapshotsLoading,
    snapshotsData,
    updateParams,
    consignerRowId,
    isRangeMode,
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
    staleTime: SNAPSHOTS_STALE_MS,
  });

  const optionsEnabled =
    !browseEmpty &&
    (isAllReports || (isRangeMode ? hasInRangeSnapshots : Boolean(resolvedSnapshotId)));

  const optionsQuery = useQuery({
    queryKey: ['epass', 'consigner-options', isAllReports, resolvedSnapshotId, appliedFilters],
    queryFn: () =>
      fetchConsignerOptions(toConsignerOptionsQueryParams(appliedFilters, resolvedSnapshotId)),
    enabled: optionsEnabled,
  });

  const { data: districtRowsData } = useQuery({
    queryKey: ['epass', 'snapshot-rows', resolvedSnapshotId, 'consignee-filters'],
    queryFn: () => {
      if (!resolvedSnapshotId) throw new Error('Snapshot required');
      return fetchSnapshotDistrictRows(resolvedSnapshotId);
    },
    enabled: Boolean(resolvedSnapshotId) && !isRangeMode && !isAllReports,
  });

  const minerals = useMemo(() => {
    if (isRangeMode || isAllReports) return rangeFilterOptions?.minerals ?? [];
    return districtRowsData?.rows ? collectMinerals(districtRowsData.rows) : [];
  }, [isRangeMode, isAllReports, rangeFilterOptions?.minerals, districtRowsData?.rows]);

  const districts = useMemo(() => {
    if (isRangeMode || isAllReports) return rangeFilterOptions?.districts ?? [];
    return districtRowsData?.rows ? collectDistricts(districtRowsData.rows) : [];
  }, [isRangeMode, isAllReports, rangeFilterOptions?.districts, districtRowsData?.rows]);

  const challansQuery = useQuery({
    queryKey: ['epass', 'challans', consignerRowId, appliedFilters],
    enabled: Boolean(consignerRowId) && !browseEmpty,
    queryFn: () => {
      if (!consignerRowId) throw new Error('Consigner required');
      return fetchConsignerChallans(consignerRowId, toConsignerChallansQueryParams(appliedFilters));
    },
  });

  const displayRows = useMemo(() => {
    if (!challansQuery.data?.items) return [];
    const filtered = applyConsigneeFilters(challansQuery.data.items, {
      consigneeSearch: appliedFilters.consigneeSearch,
      hideZeroPasses: appliedFilters.hideZeroPasses,
      dateFrom: appliedFilters.dateMode === 'range' ? appliedFilters.dateFrom : undefined,
      dateTo:
        appliedFilters.dateMode === 'range'
          ? appliedFilters.dateTo || appliedFilters.dateFrom
          : undefined,
    });
    return sortConsigneeRows(filtered, sortKey, sortDir);
  }, [challansQuery.data?.items, appliedFilters, sortKey, sortDir]);

  const totals = useMemo(() => {
    return displayRows.reduce(
      (acc, row) => {
        acc.totalChalaan += row.challanCount;
        acc.totalPasses += row.challanCount;
        acc.totalQuantity += row.dispatchedQty;
        return acc;
      },
      { totalChalaan: 0, totalPasses: 0, totalQuantity: 0 },
    );
  }, [displayRows]);

  const handleApplyFilters = useCallback(
    (next: typeof appliedFilters, extras?: ConsigneeEpassFilterExtras) => {
      const nextReportScope = extras?.reportScope ?? next.reportScope ?? 'specific';
      updateParams({
        ...serializeEpassFilterParams({ ...next, reportScope: nextReportScope }),
        reportScope: nextReportScope === 'all' ? 'all' : null,
      });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      ...allReportsClearPatch(),
      operator: null,
      role: null,
      mineral: null,
      district: null,
      consigner: null,
      consignee: null,
      hideZeroChallans: null,
      hideZeroPasses: null,
      destination: null,
      consignerRowId: null,
    });
  }, [updateParams]);

  // Clear consigner when it no longer matches filtered options
  useEffect(() => {
    if (browseEmpty || optionsQuery.isFetching || !optionsQuery.data || !consignerRowId) {
      return;
    }

    const isValid = optionsQuery.data.items.some((o) => o.id === consignerRowId);
    if (!isValid) {
      updateParams(serializeEpassFilterParams({ ...appliedFilters, consignerRowId: '' }));
    }
  }, [
    optionsQuery.data,
    optionsQuery.isFetching,
    browseEmpty,
    consignerRowId,
    appliedFilters,
    updateParams,
  ]);

  // Single consigner in scope — select automatically
  useEffect(() => {
    if (browseEmpty || consignerRowId || optionsQuery.isLoading || !optionsQuery.data) {
      return;
    }
    if (optionsQuery.data.items.length === 1) {
      updateParams(
        serializeEpassFilterParams({
          ...appliedFilters,
          consignerRowId: optionsQuery.data.items[0].id,
        }),
      );
    }
  }, [
    browseEmpty,
    consignerRowId,
    optionsQuery.isLoading,
    optionsQuery.data,
    appliedFilters,
    updateParams,
  ]);

  const handleSort = useCallback(
    (key: ConsigneeSortKey) => {
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
    },
    [sortKey, sortDir],
  );

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

  const rangeMeta = useMemo(() => {
    if (!isRangeMode || !snapshotsData?.items.length) return null;
    const inRange = snapshotsForDateMode(
      snapshotsData.items,
      appliedFilters.dateMode,
      appliedFilters.dateFrom,
      appliedFilters.dateTo,
    );
    if (inRange.length === 0) return null;
    const latestScrapedAt = inRange.reduce(
      (latest, s) => (s.scrapedAt > latest ? s.scrapedAt : latest),
      inRange[0].scrapedAt,
    );
    return { snapshotCount: inRange.length, latestScrapedAt };
  }, [
    isRangeMode,
    snapshotsData?.items,
    appliedFilters.dateMode,
    appliedFilters.dateFrom,
    appliedFilters.dateTo,
  ]);

  const allReportsMeta = useMemo(() => {
    if (!isAllReports || !rangeFilterOptions) return null;
    return {
      snapshotCount: rangeFilterOptions.entityCount ?? rangeFilterOptions.snapshotCount ?? 0,
      latestScrapedAt: rangeFilterOptions.latestScrapedAt ?? null,
    };
  }, [isAllReports, rangeFilterOptions]);

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving =
    !isRangeMode &&
    !isAllReports &&
    isSnapshotResolving(snapshotsLoaded, resolvedSnapshotId, browseEmpty);
  const pageLoading =
    snapshotsLoading ||
    snapshotResolving ||
    (!browseEmpty && !consignerRowId && optionsQuery.isLoading) ||
    (Boolean(consignerRowId) && challansQuery.isLoading);

  const consignerOptionCount = optionsQuery.data?.items.length ?? 0;
  const awaitingConsignerSelection =
    !browseEmpty && !consignerRowId && consignerOptionCount > 0 && !optionsQuery.isLoading;

  if (snapshotsError || optionsQuery.isError || challansQuery.isError) {
    return (
      <PageStack>
        <DataErrorCard
          onRetry={() => {
            void refetchSnapshots();
            void optionsQuery.refetch();
            void challansQuery.refetch();
          }}
        />
      </PageStack>
    );
  }

  if (pageLoading) {
    return (
      <ConsigneePageLoading
        showConsignerPicker={!browseEmpty}
        showTable={Boolean(consignerRowId)}
      />
    );
  }

  return (
    <PageStack>
      {isAllReports && allReportsMeta ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope="all"
          countLabel="Consignees"
          snapshotCount={allReportsMeta.snapshotCount}
          latestScrapedAt={allReportsMeta.latestScrapedAt}
        />
      ) : isRangeMode && rangeMeta ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope="range"
          snapshotCount={rangeMeta.snapshotCount}
          latestScrapedAt={rangeMeta.latestScrapedAt}
          dateFrom={appliedFilters.dateFrom}
          dateTo={appliedFilters.dateTo}
        />
      ) : metaSnapshot ? (
        <EpassReportMetaBar snapshot={metaSnapshot} />
      ) : null}

      {snapshotsData ? (
        <ConsigneeEpassFilters
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
        <Card
          className={[
            'relative overflow-visible p-4',
            consignerListOpen ? 'z-50' : 'z-10',
            awaitingConsignerSelection ? 'border-indigo-500/40 bg-indigo-500/[0.04]' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <ConsignerCombobox
            options={optionsQuery.data?.items ?? []}
            value={consignerRowId}
            onChange={handleConsignerChange}
            loading={false}
            awaitingSelection={awaitingConsignerSelection}
            onOpenChange={setConsignerListOpen}
          />
        </Card>
      )}

      {!browseEmpty && !consignerRowId && (optionsQuery.data?.items.length ?? 0) === 0 ? (
        <EmptyStateCard message="No consigners found" />
      ) : null}

      {consignerRowId ? (
        <>
          {challansQuery.data ? (
            <>
              <h2 className="text-xl font-semibold text-white">
                {challansQuery.data.consigner.consignerName}
                <span className="ml-2 text-sm font-normal text-text-secondary">
                  {challansQuery.data.districtRow.dmoName} ·{' '}
                  {formatOperatorType(
                    challansQuery.data.consigner.operatorType ?? challansQuery.data.consigner.role,
                  )}
                  {challansQuery.data.consigner.ghatNumber?.trim()
                    ? ` · ${challansQuery.data.consigner.ghatNumber.trim()}`
                    : ''}
                </span>
              </h2>
              {challansQuery.data.incompleteScrape ? (
                <IncompleteScrapeBanner
                  portalCount={displayRows.reduce((sum, row) => sum + row.challanCount, 0)}
                  storedCount={displayRows.reduce(
                    (sum, row) => sum + (row.storedPassCount ?? 0),
                    0,
                  )}
                />
              ) : null}
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
                                consignee: normalizeConsigneeFilterQuery(row.consigneeName),
                                snapshotId: resolvedSnapshotId ?? null,
                              })
                            : null
                      : undefined
                  }
                />
              )}
              {displayRows.length > 0 ? (
                <Card>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <p className="tabular-nums text-text-secondary">
                      Total Chalaan:{' '}
                      <span className="font-semibold text-white">{totals.totalChalaan}</span>
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
                    {challansQuery.data?.truncated ? (
                      <p className="text-xs text-text-secondary">Capped at 25000 rows</p>
                    ) : null}
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </PageStack>
  );
}

export default function ConsigneePage() {
  return (
    <Suspense fallback={<EpassBrowsePageSkeleton showConsignerPicker />}>
      <ConsigneePageContent />
    </Suspense>
  );
}
