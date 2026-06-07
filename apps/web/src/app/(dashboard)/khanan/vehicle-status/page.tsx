'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EpassEmptyState } from '@/components/khanan/EpassEmptyState';
import { VehicleStatusFilters } from '@/components/khanan/VehicleStatusFilters';
import { VehicleStatusMetaBar } from '@/components/khanan/VehicleStatusMetaBar';
import { VehicleStatusTable } from '@/components/khanan/VehicleStatusTable';
import { VehicleStatusPageLoading, VehicleStatusPageSkeleton } from '@/components/khanan/skeletons';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import {
  parseVehicleStatusFilters,
  serializeVehicleStatusFoundFilter,
} from '@/lib/epass-vehicle-status-view';
import { addVehicleToCrmExpiry } from '@/lib/crm';
import { fetchVehicleStatusList } from '@/lib/epass';
import {
  invalidateCrmExpiryData,
  invalidateVehicleStatusData,
  liveQueryOptions,
  VEHICLE_STATUS_QUERY_KEY,
} from '@/lib/query-config';
import type {
  VehicleStatusFilterValues,
  VehicleStatusSortDir,
  VehicleStatusSortKey,
} from '@/lib/epass-types';

const PAGE_SIZE = 50;

function parseSortKey(raw: string | null): VehicleStatusSortKey | null {
  const keys: VehicleStatusSortKey[] = [
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
  ];
  return keys.includes(raw as VehicleStatusSortKey) ? (raw as VehicleStatusSortKey) : null;
}

function VehicleStatusPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [addingToCrmRegNo, setAddingToCrmRegNo] = useState<string | null>(null);
  const [addToCrmError, setAddToCrmError] = useState<string | null>(null);
  const appliedFilters = useMemo(() => parseVehicleStatusFilters(searchParams), [searchParams]);
  const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);
  const pageSize = Math.max(Number(searchParams.get('limit') || String(PAGE_SIZE)), 10);
  const sortKey = parseSortKey(searchParams.get('sort')) ?? 'vehicleRegNo';
  const sortDir: VehicleStatusSortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  const listParams = useMemo(
    () => ({
      q: appliedFilters.search || undefined,
      found:
        appliedFilters.found === 'found'
          ? true
          : appliedFilters.found === 'notFound'
            ? false
            : undefined,
      insuranceExpiryDays: appliedFilters.insuranceExpiryDays
        ? Number(appliedFilters.insuranceExpiryDays)
        : undefined,
      rcExpiryDays: appliedFilters.rcExpiryDays ? Number(appliedFilters.rcExpiryDays) : undefined,
      fitnessExpiryDays: appliedFilters.fitnessExpiryDays
        ? Number(appliedFilters.fitnessExpiryDays)
        : undefined,
      grossWeightMin: appliedFilters.grossWeightMin
        ? Number(appliedFilters.grossWeightMin)
        : undefined,
      grossWeightMax: appliedFilters.grossWeightMax
        ? Number(appliedFilters.grossWeightMax)
        : undefined,
      vehicleClass: appliedFilters.vehicleClass || undefined,
      esimValidity: appliedFilters.esimValidity || undefined,
      sort: sortKey,
      dir: sortDir,
      limit: pageSize,
      offset,
      includeCrm: true,
    }),
    [appliedFilters, sortKey, sortDir, pageSize, offset],
  );

  const addToCrmMutation = useMutation({
    mutationFn: (vehicleRegNo: string) => addVehicleToCrmExpiry(vehicleRegNo),
    onSuccess: async () => {
      setAddToCrmError(null);
      await invalidateVehicleStatusData(queryClient);
      await invalidateCrmExpiryData(queryClient);
    },
    onError: (e: Error) => setAddToCrmError(e.message),
  });

  const handleAddToCrm = useCallback(
    async (vehicleRegNo: string) => {
      setAddingToCrmRegNo(vehicleRegNo);
      setAddToCrmError(null);
      try {
        await addToCrmMutation.mutateAsync(vehicleRegNo);
      } finally {
        setAddingToCrmRegNo(null);
      }
    },
    [addToCrmMutation],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...VEHICLE_STATUS_QUERY_KEY, listParams],
    queryFn: () => {
      return fetchVehicleStatusList(listParams);
    },
    ...liveQueryOptions,
  });

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
      }
      router.replace(`/khanan/vehicle-status?${next.toString()}`);
    },
    [router, searchParams],
  );

  const handleSort = useCallback(
    (key: VehicleStatusSortKey) => {
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
    (next: VehicleStatusFilterValues) => {
      updateParams({
        q: next.search.trim() || null,
        found: serializeVehicleStatusFoundFilter(next.found),
        insuranceExpiryDays: next.insuranceExpiryDays.trim() || null,
        rcExpiryDays: next.rcExpiryDays.trim() || null,
        fitnessExpiryDays: next.fitnessExpiryDays.trim() || null,
        grossWeightMin: next.grossWeightMin.trim() || null,
        grossWeightMax: next.grossWeightMax.trim() || null,
        vehicleClass: next.vehicleClass.trim() || null,
        esimValidity: next.esimValidity.trim() || null,
        offset: '0',
      });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      q: null,
      found: null,
      insuranceExpiryDays: null,
      rcExpiryDays: null,
      fitnessExpiryDays: null,
      grossWeightMin: null,
      grossWeightMax: null,
      vehicleClass: null,
      esimValidity: null,
      offset: '0',
    });
  }, [updateParams]);

  const total = data?.total ?? 0;
  const activeSortKey = searchParams.get('sort') ? sortKey : null;
  const noRecords = (data?.stats?.total ?? 0) === 0;

  if (isError) {
    return (
      <PageStack>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Vehicle Status</h1>
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
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Vehicle Status</h1>
        <VehicleStatusFilters
          values={appliedFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
        <VehicleStatusPageLoading />
      </PageStack>
    );
  }

  return (
    <PageStack>
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Vehicle Status</h1>

      {noRecords ? (
        <EpassEmptyState
          message="No vehicle status records yet"
          icon="upload"
          actions={[
            { label: 'Import Data', href: '/khanan/import', variant: 'primary' },
            { label: 'Khanan Config', href: '/khanan/config', variant: 'secondary' },
          ]}
        />
      ) : (
        <>
          <VehicleStatusMetaBar stats={data?.stats ?? null} />

          <VehicleStatusFilters
            values={appliedFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />

          {addToCrmError ? (
            <p className="text-sm text-rose-300" role="alert">
              {addToCrmError}
            </p>
          ) : null}

          {data ? (
            <>
              <VehicleStatusTable
                rows={data.items}
                sortKey={activeSortKey}
                sortDir={sortDir}
                onSort={handleSort}
                onAddToCrm={(vrn) => void handleAddToCrm(vrn)}
                addingToCrmRegNo={addingToCrmRegNo}
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
        </>
      )}
    </PageStack>
  );
}

export default function VehicleStatusPage() {
  return (
    <Suspense fallback={<VehicleStatusPageSkeleton />}>
      <VehicleStatusPageContent />
    </Suspense>
  );
}
