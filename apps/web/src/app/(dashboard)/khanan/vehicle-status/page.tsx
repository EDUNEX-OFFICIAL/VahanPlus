'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ResponsivePagination } from '@/components/ui/ResponsivePagination';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { VehicleStatusFilters } from '@/components/khanan/VehicleStatusFilters';
import { VehicleStatusMetaBar } from '@/components/khanan/VehicleStatusMetaBar';
import { VehicleStatusTable } from '@/components/khanan/VehicleStatusTable';
import { VehicleStatusPageLoading, VehicleStatusPageSkeleton } from '@/components/khanan/skeletons';
import {
  parseVehicleStatusFilters,
  serializeVehicleStatusFoundFilter,
} from '@/lib/epass-vehicle-status-view';
import { fetchVehicleStatusList } from '@/lib/epass';
import type {
  VehicleStatusFilterValues,
  VehicleStatusSortDir,
  VehicleStatusSortKey,
} from '@/lib/epass-types';

const PAGE_SIZE = 50;
const VEHICLE_STATUS_QUERY_KEY = ['epass', 'vehicle-status'] as const;

function parseSortKey(raw: string | null): VehicleStatusSortKey | null {
  const keys: VehicleStatusSortKey[] = [
    'vehicleRegNo',
    'ksRegNo',
    'vehicleClass',
    'rcFitUpTo',
    'rcTaxUpTo',
    'insuranceUpTo',
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
      sort: sortKey,
      dir: sortDir,
      limit: pageSize,
      offset,
    }),
    [appliedFilters, sortKey, sortDir, pageSize, offset],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...VEHICLE_STATUS_QUERY_KEY, listParams],
    queryFn: () => {
      return fetchVehicleStatusList(listParams);
    },
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
        offset: '0',
      });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    updateParams({
      q: null,
      found: null,
      offset: '0',
    });
  }, [updateParams]);

  const total = data?.total ?? 0;
  const activeSortKey = searchParams.get('sort') ? sortKey : null;

  if (isError) {
    return (
      <PageStack>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Vehicle Status</h1>
        <Card className="border-red-500/30">
          <p className="text-sm font-semibold text-red-400">Unable to load data</p>
          {error instanceof Error && error.message ? (
            <p className="mt-2 text-xs text-text-secondary">{error.message}</p>
          ) : null}
          <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
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

      <VehicleStatusMetaBar stats={data?.stats ?? null} />

      <VehicleStatusFilters
        values={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {data ? (
        <>
          <VehicleStatusTable
            rows={data.items}
            sortKey={activeSortKey}
            sortDir={sortDir}
            onSort={handleSort}
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

export default function VehicleStatusPage() {
  return (
    <Suspense fallback={<VehicleStatusPageSkeleton />}>
      <VehicleStatusPageContent />
    </Suspense>
  );
}
