'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CrmExpiryFilters } from '@/components/crm/CrmExpiryFilters';
import { CrmExpiryMetaBar } from '@/components/crm/CrmExpiryMetaBar';
import { CrmExpiryTable } from '@/components/crm/CrmExpiryTable';
import {
  CrmExpiryPageLoading,
  CrmExpiryPageSkeleton,
} from '@/components/crm/skeletons/CrmExpiryPageSkeleton';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { Button } from '@/components/ui/Button';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import {
  bulkRemoveVehiclesFromCrmExpiry,
  fetchCrmVehicleExpiryList,
  removeVehicleFromCrmExpiry,
} from '@/lib/crm';
import {
  DEFAULT_CRM_EXPIRY_DAYS,
  parseCrmExpiryFilters,
  serializeCrmExpiryFoundFilter,
} from '@/lib/crm-expiry-view';
import type { CrmExpiryFilterValues, CrmExpirySortKey } from '@/lib/crm-types';
import type { VehicleStatusSortDir } from '@/lib/epass-types';

const PAGE_SIZE = 50;
const CRM_EXPIRY_QUERY_KEY = ['crm', 'vehicle-expiry'] as const;

function parseSortKey(raw: string | null): CrmExpirySortKey | null {
  const keys: CrmExpirySortKey[] = [
    'vehicleRegNo',
    'ksRegNo',
    'vehicleClass',
    'rcFitUpTo',
    'rcTaxUpTo',
    'insuranceUpTo',
    'insuranceDaysLeft',
    'rcDaysLeft',
    'fitnessDaysLeft',
    'puccUpTo',
    'imeiNo',
    'esimValidity',
    'grossWeightMt',
    'unladenWeightMt',
    'scrapedAt',
    'crmSource',
  ];
  return keys.includes(raw as CrmExpirySortKey) ? (raw as CrmExpirySortKey) : null;
}

function parseExpiryDays(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : Number(DEFAULT_CRM_EXPIRY_DAYS);
}

function CrmVehicleExpiryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const appliedFilters = useMemo(() => parseCrmExpiryFilters(searchParams), [searchParams]);
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const pageSize = Math.max(Number(searchParams.get('limit') || String(PAGE_SIZE)), 10);
  const sortKey = parseSortKey(searchParams.get('sort')) ?? 'vehicleRegNo';
  const sortDir: VehicleStatusSortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removingRegNo, setRemovingRegNo] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({
      q: appliedFilters.search || undefined,
      found:
        appliedFilters.found === 'found'
          ? true
          : appliedFilters.found === 'notFound'
            ? false
            : undefined,
      insuranceExpiryDays: parseExpiryDays(appliedFilters.insuranceExpiryDays),
      rcExpiryDays: parseExpiryDays(appliedFilters.rcExpiryDays),
      fitnessExpiryDays: parseExpiryDays(appliedFilters.fitnessExpiryDays),
      grossWeightMin: appliedFilters.grossWeightMin
        ? Number(appliedFilters.grossWeightMin)
        : undefined,
      grossWeightMax: appliedFilters.grossWeightMax
        ? Number(appliedFilters.grossWeightMax)
        : undefined,
      vehicleClass: appliedFilters.vehicleClass || undefined,
      esimValidity: appliedFilters.esimValidity || undefined,
      source: appliedFilters.source,
      status: appliedFilters.status,
      sort: sortKey,
      dir: sortDir,
      limit: pageSize,
      offset,
    }),
    [appliedFilters, sortKey, sortDir, pageSize, offset],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...CRM_EXPIRY_QUERY_KEY, listParams],
    queryFn: () => fetchCrmVehicleExpiryList(listParams),
  });

  const removeMutation = useMutation({
    mutationFn: (vehicleRegNos: string[]) => {
      if (vehicleRegNos.length === 1) {
        return removeVehicleFromCrmExpiry(vehicleRegNos[0]).then(() => vehicleRegNos);
      }
      return bulkRemoveVehiclesFromCrmExpiry(vehicleRegNos).then((r) => r.vehicleRegNos);
    },
    onSuccess: async (removed) => {
      setActionError(null);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const vrn of removed) next.delete(vrn);
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: CRM_EXPIRY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['epass', 'vehicle-status'] });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/crm/vehicle-expiry?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleSort = useCallback(
    (key: CrmExpirySortKey) => {
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
    (next: CrmExpiryFilterValues) => {
      updateParams({
        q: next.search.trim() || null,
        found: serializeCrmExpiryFoundFilter(next.found),
        status: next.status === 'active' ? null : next.status,
        source: next.source === 'all' ? null : next.source,
        insuranceExpiryDays: next.insuranceExpiryDays.trim() || DEFAULT_CRM_EXPIRY_DAYS,
        rcExpiryDays: next.rcExpiryDays.trim() || DEFAULT_CRM_EXPIRY_DAYS,
        fitnessExpiryDays: next.fitnessExpiryDays.trim() || DEFAULT_CRM_EXPIRY_DAYS,
        grossWeightMin: next.grossWeightMin.trim() || null,
        grossWeightMax: next.grossWeightMax.trim() || null,
        vehicleClass: next.vehicleClass.trim() || null,
        esimValidity: next.esimValidity.trim() || null,
        offset: '0',
      });
      setSelected(new Set());
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      q: null,
      found: null,
      status: null,
      source: null,
      insuranceExpiryDays: DEFAULT_CRM_EXPIRY_DAYS,
      rcExpiryDays: DEFAULT_CRM_EXPIRY_DAYS,
      fitnessExpiryDays: DEFAULT_CRM_EXPIRY_DAYS,
      grossWeightMin: null,
      grossWeightMax: null,
      vehicleClass: null,
      esimValidity: null,
      offset: '0',
    });
    setSelected(new Set());
  }, [updateParams]);

  const pageRows = useMemo(() => data?.items ?? [], [data?.items]);
  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.vehicleRegNo));

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(pageRows.map((r) => r.vehicleRegNo)));
  }, [allSelected, pageRows]);

  const handleToggleRow = useCallback((vehicleRegNo: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleRegNo)) next.delete(vehicleRegNo);
      else next.add(vehicleRegNo);
      return next;
    });
  }, []);

  const handleRemove = useCallback(
    async (vehicleRegNo: string) => {
      setRemovingRegNo(vehicleRegNo);
      try {
        await removeMutation.mutateAsync([vehicleRegNo]);
      } finally {
        setRemovingRegNo(null);
      }
    },
    [removeMutation],
  );

  const handleBulkRemove = useCallback(async () => {
    const vrns = [...selected];
    if (vrns.length === 0) return;
    await removeMutation.mutateAsync(vrns);
  }, [removeMutation, selected]);

  const showRemove = appliedFilters.status === 'active';
  const total = data?.total ?? 0;
  const activeSortKey = searchParams.get('sort') ? sortKey : null;

  useEffect(() => {
    if (data && offset > 0 && offset >= total) {
      updateParams({ offset: '0' });
    }
  }, [data, offset, total, updateParams]);

  useEffect(() => {
    setSelected(new Set());
  }, [appliedFilters.status, appliedFilters.source]);

  if (isError) {
    return (
      <PageStack>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Vehicle Expiry</h1>
        <DataErrorCard
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </PageStack>
    );
  }

  if (isLoading) {
    return (
      <PageStack>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Vehicle Expiry</h1>
        <CrmExpiryMetaBar stats={null} isLoading />
        <CrmExpiryFilters
          values={appliedFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
        <CrmExpiryPageLoading />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Vehicle Expiry</h1>

      <CrmExpiryMetaBar stats={data?.stats ?? null} />

      <CrmExpiryFilters
        values={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {actionError ? (
        <p className="text-sm text-rose-300" role="alert">
          {actionError}
        </p>
      ) : null}

      {selected.size > 0 && showRemove ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            className="text-sm"
            disabled={removeMutation.isPending}
            onClick={() => void handleBulkRemove()}
          >
            Remove from CRM ({selected.size})
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <CrmExpiryTable
            rows={data.items}
            sortKey={activeSortKey}
            sortDir={sortDir}
            onSort={handleSort}
            selected={selected}
            onToggleRow={handleToggleRow}
            onToggleAll={handleToggleAll}
            allSelected={allSelected}
            onRemove={(vrn) => void handleRemove(vrn)}
            removingRegNo={removingRegNo}
            showRemove={showRemove}
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

export default function CrmVehicleExpiryPage() {
  return (
    <Suspense fallback={<CrmExpiryPageSkeleton />}>
      <CrmVehicleExpiryPageContent />
    </Suspense>
  );
}
