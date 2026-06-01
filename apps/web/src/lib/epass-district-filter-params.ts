import type {
  DistrictDateMode,
  DistrictFilterValues,
} from '@/components/khanan/DistrictEpassFilters';
import { parseDistrictsParam, serializeDistricts } from '@/lib/epass-district-view';
import type { DistrictSortDir, DistrictSortKey } from '@/lib/epass-types';
import { parseOperatorParam } from '@/lib/operator';

export function parseDistrictSortKey(value: string | null): DistrictSortKey | null {
  const keys: DistrictSortKey[] = ['district', 'totalUsers', 'mineral', 'passes', 'quantity'];
  return keys.includes(value as DistrictSortKey) ? (value as DistrictSortKey) : null;
}

export function parseMineralsParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

export function serializeMinerals(minerals: string[]): string | null {
  if (minerals.length === 0) return null;
  return minerals.join(',');
}

export function parseDateMode(value: string | null): DistrictDateMode {
  return value === 'range' ? 'range' : 'specific';
}

export function districtFiltersFromParams(searchParams: URLSearchParams): DistrictFilterValues {
  return {
    operator: parseOperatorParam(searchParams.get('operator'), searchParams.get('role')),
    minerals: parseMineralsParam(searchParams.get('mineral')),
    dateMode: parseDateMode(searchParams.get('dateMode')),
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    reportDate: searchParams.get('reportDate') ?? '',
    snapshotId: searchParams.get('snapshotId') ?? '',
    districts: parseDistrictsParam(searchParams.get('district')),
    hideZeroPasses: searchParams.get('hideZeroPasses') === '1',
  };
}

export function districtParamsFromFilters(
  filters: DistrictFilterValues,
  sortKey: DistrictSortKey | null,
  sortDir: DistrictSortDir,
): Record<string, string | null> {
  return {
    snapshotId: filters.snapshotId || null,
    operator: filters.operator === 'all' ? null : filters.operator,
    mineral: serializeMinerals(filters.minerals),
    dateMode: filters.dateMode === 'specific' ? null : filters.dateMode,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    reportDate: filters.reportDate || null,
    district: serializeDistricts(filters.districts),
    hideZeroPasses: filters.hideZeroPasses ? '1' : null,
    sort: sortKey,
    dir: sortKey ? sortDir : null,
  };
}
