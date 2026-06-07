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
import { EpassBrowsePageSkeleton } from '@/components/khanan/skeletons';
import { EpassReportMetaBarSkeleton } from '@/components/khanan/skeletons/EpassReportMetaBarSkeleton';
import { EpassTableSkeleton } from '@/components/khanan/skeletons/EpassTableSkeleton';
import { isSnapshotResolving } from '@/lib/epass-page-loading';
import { formatOperatorType } from '@/lib/operator';
import { applyConsigneeFilters, sortConsigneeRows } from '@/lib/epass-consignee-view';
import { normalizeConsigneeFilterQuery } from '@/lib/epass-query-normalize';
import {
  buildChallanHref,
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
} from '@/lib/epass';
import { resolveSnapshotIdForDateFilters, snapshotsForDateMode } from '@/lib/epass-report-date';
import { allReportsBootstrapPatch, allReportsClearPatch } from '@/lib/epass-report-scope';
import { reportingQueryOptions, staticQueryOptions } from '@/lib/query-config';
import type { ConsigneeEpassFilterExtras } from '@/components/khanan/ConsigneeEpassFilters';
import type {
  ConsigneeSortDir,
  ConsigneeSortKey,
  ConsignerChallansResponse,
  EpassSnapshotDto,
  EpassSnapshotReportDateItemDto,
} from '@/lib/epass-types';

function queryErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

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
    error: snapshotsQueryError,
    refetch: refetchSnapshots,
  } = useQuery({
    queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY,
    queryFn: () => fetchEpassSnapshotReportDates(),
    ...staticQueryOptions,
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
    isAllReports || isRangeMode,
  );

  useEffect(() => {
    if (!isRangeMode) return;
    if (!appliedFilters.snapshotId && !appliedFilters.reportDate) return;
    updateParams({ snapshotId: null, reportDate: null, reportScope: null });
  }, [isRangeMode, appliedFilters.snapshotId, appliedFilters.reportDate, updateParams]);

  useEffect(() => {
    const hasScope = searchParams.has('reportScope');
    const hasSnapshot = searchParams.has('snapshotId');
    if (!hasScope && !hasSnapshot && !isRangeMode) {
      updateParams(allReportsBootstrapPatch());
    }
  }, [searchParams, updateParams, isRangeMode]);

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
      snapshotId:
        !isRangeMode && !isAllReports && resolvedSnapshotId ? resolvedSnapshotId : undefined,
      dateMode: isRangeMode ? ('range' as const) : undefined,
      dateFrom: appliedFilters.dateFrom || undefined,
      dateTo: appliedFilters.dateTo || undefined,
    }),
    [isRangeMode, isAllReports, resolvedSnapshotId, appliedFilters.dateFrom, appliedFilters.dateTo],
  );

  const filterOptionsEnabled =
    Boolean(snapshotsData?.items.length) &&
    (isAllReports || isRangeMode || Boolean(resolvedSnapshotId));

  const {
    data: filterOptionsData,
    isLoading: filterOptionsLoading,
    isFetching: filterOptionsFetching,
  } = useQuery({
    queryKey: ['epass', 'filter-options', filterOptionsParams],
    queryFn: () => fetchEpassFilterOptions(filterOptionsParams),
    enabled: filterOptionsEnabled,
    ...staticQueryOptions,
  });

  const optionsEnabled =
    !browseEmpty &&
    (isAllReports || (isRangeMode ? hasInRangeSnapshots : Boolean(resolvedSnapshotId)));

  const optionsQuery = useQuery({
    queryKey: ['epass', 'consigner-options', isAllReports, resolvedSnapshotId, appliedFilters],
    queryFn: () =>
      fetchConsignerOptions(toConsignerOptionsQueryParams(appliedFilters, resolvedSnapshotId)),
    enabled: optionsEnabled,
    ...reportingQueryOptions,
  });

  const minerals = filterOptionsData?.minerals ?? [];
  const districts = filterOptionsData?.districts ?? [];

  const challansQuery = useQuery({
    queryKey: ['epass', 'challans', consignerRowId, appliedFilters],
    enabled: Boolean(consignerRowId) && !browseEmpty,
    queryFn: () => {
      if (!consignerRowId) throw new Error('Consigner required');
      return fetchConsignerChallans(consignerRowId, toConsignerChallansQueryParams(appliedFilters));
    },
    placeholderData: (previousData, previousQuery) => {
      if (previousQuery?.queryKey[2] === consignerRowId) {
        return previousData;
      }
      return undefined;
    },
    ...reportingQueryOptions,
  });

  const displayRows = useMemo(() => {
    if (!challansQuery.data?.items) return [];
    const filtered = applyConsigneeFilters(challansQuery.data.items, {
      minerals: appliedFilters.minerals,
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
        acc.totalChallan += row.challanCount;
        acc.totalPasses += row.challanCount;
        acc.totalQuantity += row.dispatchedQty;
        return acc;
      },
      { totalChallan: 0, totalPasses: 0, totalQuantity: 0 },
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
      updateParams(
        serializeEpassFilterParams({
          ...appliedFilters,
          consignerRowId: id,
        }),
      );
    },
    [appliedFilters, updateParams],
  );

  const metaSnapshot = useMemo(() => {
    if (!resolvedSnapshotId || !snapshotsData?.items.length) return null;
    const snap = snapshotsData.items.find((s) => s.id === resolvedSnapshotId);
    return snap ? snapshotFromListItem(snap) : null;
  }, [resolvedSnapshotId, snapshotsData?.items]);

  const scopedFilterMeta = useMemo(() => {
    if (!filterOptionsData) return null;
    const count =
      filterOptionsData.consigneeCount ??
      filterOptionsData.entityCount ??
      filterOptionsData.snapshotCount ??
      0;
    return {
      consigneeCount: count,
      latestScrapedAt: filterOptionsData.latestScrapedAt ?? null,
    };
  }, [filterOptionsData]);

  const snapshotsLoaded = Boolean(snapshotsData?.items.length) && !snapshotsLoading;
  const snapshotResolving =
    !isRangeMode &&
    !isAllReports &&
    isSnapshotResolving(snapshotsLoaded, resolvedSnapshotId, browseEmpty);
  const filterMetaPending =
    (isAllReports || isRangeMode || Boolean(resolvedSnapshotId)) &&
    filterOptionsEnabled &&
    (filterOptionsLoading || filterOptionsFetching) &&
    !filterOptionsData;
  const metaLoading = snapshotsLoading || snapshotResolving || filterMetaPending;

  const optionsLoading = optionsEnabled && optionsQuery.isLoading && !optionsQuery.data;
  const optionsRefetching = optionsEnabled && optionsQuery.isFetching && Boolean(optionsQuery.data);
  const challansInitialLoading =
    Boolean(consignerRowId) && !challansQuery.data && challansQuery.isLoading;
  const challansRefetching = Boolean(challansQuery.data) && challansQuery.isFetching;

  const consignerOptionCount = optionsQuery.data?.total ?? optionsQuery.data?.items.length ?? 0;
  const consignerOptionsTruncated = optionsQuery.data?.truncated ?? false;
  const awaitingConsignerSelection =
    !browseEmpty &&
    !consignerRowId &&
    consignerOptionCount > 0 &&
    !optionsLoading &&
    !optionsRefetching;

  const selectedConsignerOption = useMemo(
    () => optionsQuery.data?.items.find((o) => o.id === consignerRowId),
    [optionsQuery.data?.items, consignerRowId],
  );

  const challansPayload: ConsignerChallansResponse | undefined = challansQuery.data;
  const showConsignerHeader = Boolean(challansPayload ?? selectedConsignerOption);

  const snapshotsFatalError = snapshotsError ? queryErrorMessage(snapshotsQueryError) : undefined;
  const optionsInlineError =
    optionsEnabled && optionsQuery.isError ? queryErrorMessage(optionsQuery.error) : undefined;

  if (snapshotsFatalError) {
    return (
      <PageStack>
        <DataErrorCard message={snapshotsFatalError} onRetry={() => void refetchSnapshots()} />
      </PageStack>
    );
  }

  return (
    <PageStack>
      {metaLoading ? (
        <EpassReportMetaBarSkeleton />
      ) : isAllReports && scopedFilterMeta ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope="all"
          countLabel="Consignees"
          snapshotCount={scopedFilterMeta.consigneeCount}
          latestScrapedAt={scopedFilterMeta.latestScrapedAt}
        />
      ) : isRangeMode && scopedFilterMeta ? (
        <EpassReportMetaBar
          snapshot={null}
          reportScope="range"
          countLabel="Consignees"
          snapshotCount={scopedFilterMeta.consigneeCount}
          latestScrapedAt={scopedFilterMeta.latestScrapedAt}
          dateFrom={appliedFilters.dateFrom}
          dateTo={appliedFilters.dateTo}
        />
      ) : metaSnapshot ? (
        <EpassReportMetaBar snapshot={metaSnapshot} />
      ) : null}

      <ConsigneeEpassFilters
        snapshots={snapshotsData?.items ?? []}
        minerals={minerals}
        districts={districts}
        values={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        allowAllReports
        reportScope={appliedFilters.reportScope ?? 'specific'}
        applyDisabled={!snapshotsLoaded}
      />

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
            loading={optionsLoading}
            refetching={optionsRefetching}
            total={consignerOptionCount}
            truncated={consignerOptionsTruncated}
            awaitingSelection={awaitingConsignerSelection}
            onOpenChange={setConsignerListOpen}
          />
          {optionsInlineError ? (
            <div className="mt-3">
              <DataErrorCard
                message={optionsInlineError}
                onRetry={() => {
                  void optionsQuery.refetch();
                }}
              />
            </div>
          ) : null}
        </Card>
      )}

      {!browseEmpty && !consignerRowId && !optionsLoading && consignerOptionCount === 0 ? (
        <EmptyStateCard message="No consigners found" />
      ) : null}

      {consignerRowId ? (
        <>
          {challansInitialLoading ? (
            <EpassTableSkeleton rows={6} />
          ) : challansQuery.isError ? (
            <DataErrorCard
              message={queryErrorMessage(challansQuery.error)}
              onRetry={() => {
                void challansQuery.refetch();
              }}
            />
          ) : showConsignerHeader ? (
            <>
              <h2 className="text-xl font-semibold text-white">
                {challansPayload?.consigner.consignerName ??
                  selectedConsignerOption?.consignerName ??
                  'Consigner'}
                <span className="ml-2 text-sm font-normal text-text-secondary">
                  {(challansPayload?.districtRow.dmoName ?? selectedConsignerOption?.dmoName) &&
                    `${challansPayload?.districtRow.dmoName ?? selectedConsignerOption?.dmoName} · `}
                  {formatOperatorType(
                    challansPayload?.consigner.operatorType ??
                      challansPayload?.consigner.role ??
                      selectedConsignerOption?.operatorType ??
                      selectedConsignerOption?.role ??
                      'lessee',
                  )}
                  {(
                    challansPayload?.consigner.ghatNumber ?? selectedConsignerOption?.ghatNumber
                  )?.trim()
                    ? ` · ${(challansPayload?.consigner.ghatNumber ?? selectedConsignerOption?.ghatNumber)?.trim()}`
                    : ''}
                </span>
              </h2>
              {challansPayload?.incompleteScrape ? (
                <IncompleteScrapeBanner
                  portalCount={displayRows.reduce((sum, row) => sum + row.challanCount, 0)}
                  storedCount={displayRows.reduce(
                    (sum, row) => sum + (row.storedPassCount ?? 0),
                    0,
                  )}
                />
              ) : null}
              {!challansRefetching && displayRows.length > 0 ? (
                <p className="text-xs text-text-secondary tabular-nums">
                  Showing {displayRows.length} line{displayRows.length === 1 ? '' : 's'}
                  {appliedFilters.dateMode === 'range' ? ' in date range' : ''}
                </p>
              ) : null}
              {challansRefetching ? (
                <ConsigneeTable
                  rows={[]}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  bodyLoading
                  bodyLoadingRows={6}
                />
              ) : displayRows.length === 0 ? (
                <Card>
                  <p className="text-sm text-text-secondary">No consignee lines found</p>
                </Card>
              ) : (
                <ConsigneeTable
                  rows={displayRows}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  getChallanHref={
                    challansPayload
                      ? (row) =>
                          row.challanCount > 0
                            ? buildChallanHref(searchParams, {
                                district: challansPayload.districtRow.dmoName,
                                consigner: challansPayload.consigner.consignerName,
                                consignee: normalizeConsigneeFilterQuery(row.consigneeName),
                                snapshotId: resolvedSnapshotId ?? null,
                              })
                            : null
                      : undefined
                  }
                />
              )}
              {!challansRefetching && displayRows.length > 0 ? (
                <Card>
                  <div className="flex flex-wrap gap-6 text-sm">
                    <p className="tabular-nums text-text-secondary">
                      Total Challan:{' '}
                      <span className="font-semibold text-white">{totals.totalChallan}</span>
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
                    {challansPayload?.truncated ? (
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
