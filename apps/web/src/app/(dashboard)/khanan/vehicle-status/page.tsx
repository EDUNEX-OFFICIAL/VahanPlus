'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
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
        <Card className="border border-dashed border-slate-600/50 bg-slate-900/20 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-200">No vehicle status records yet</p>
          <p className="mt-2 text-sm text-text-secondary">
            MCV weights and fitness data come from the scraper pipeline (after challan passes) or a
            vehicle status CSV on Import Data.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/khanan/config"
              className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/25"
            >
              Khanan Config
            </Link>
            <Link
              href="/khanan/import"
              className="rounded-xl border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Import Data
            </Link>
          </div>
        </Card>
      ) : (
        <>
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
