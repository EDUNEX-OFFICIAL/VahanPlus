import { parseConsignerMineralsParam, serializeConsignerMinerals } from '@/lib/epass-consigner-view';
import { parseDistrictsParam, serializeDistricts } from '@/lib/epass-district-view';
import type { ChalaanListParams, EpassBrowseFilterValues } from '@/lib/epass-types';
import type { EpassDateMode } from '@/lib/epass-report-date';
import { parseOperatorParam } from '@/lib/operator';

export type { EpassBrowseFilterValues, EpassDateMode };

const PRESERVE_KEYS = [
  'snapshotId',
  'reportDate',
  'dateMode',
  'dateFrom',
  'dateTo',
  'operator',
  'role',
  'mineral',
  'district',
  'dmo',
  'hideZeroChallans',
  'hideZeroPasses',
  'consigner',
  'consignee',
] as const;

export function parseEpassFilterParams(searchParams: URLSearchParams): EpassBrowseFilterValues {
  const districtRaw = searchParams.get('district') ?? searchParams.get('dmo') ?? '';
  return {
    operator: parseOperatorParam(
      searchParams.get('operator'),
      searchParams.get('role'),
    ),
    minerals: parseConsignerMineralsParam(searchParams.get('mineral')),
    dateMode: searchParams.get('dateMode') === 'range' ? 'range' : 'specific',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    reportDate: searchParams.get('reportDate') ?? '',
    snapshotId: searchParams.get('snapshotId') ?? '',
    districts: parseDistrictsParam(districtRaw),
    consignerSearch: searchParams.get('consigner') ?? '',
    hideZeroChallans: searchParams.get('hideZeroChallans') === '1',
    consigneeSearch: searchParams.get('consignee') ?? '',
    hideZeroPasses: searchParams.get('hideZeroPasses') === '1',
    consignerRowId: searchParams.get('consignerRowId') ?? '',
  };
}

export function serializeEpassFilterParams(
  filters: EpassBrowseFilterValues,
  extra?: Record<string, string | null>,
): Record<string, string | null> {
  return {
    snapshotId: filters.snapshotId || null,
    reportDate: filters.reportDate || null,
    dateMode: filters.dateMode === 'specific' ? null : filters.dateMode,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    operator: filters.operator === 'all' ? null : filters.operator,
    role: null,
    mineral: serializeConsignerMinerals(filters.minerals) ?? null,
    district: serializeDistricts(filters.districts),
    dmo: null,
    hideZeroChallans: filters.hideZeroChallans ? '1' : null,
    hideZeroPasses: filters.hideZeroPasses ? '1' : null,
    consigner: filters.consignerSearch.trim() || null,
    consignee: filters.consigneeSearch.trim() || null,
    consignerRowId: filters.consignerRowId || null,
    ...extra,
  };
}

export function copyEpassParamsFromSearch(
  searchParams: URLSearchParams,
  omit: string[] = ['sort', 'dir', 'offset'],
): URLSearchParams {
  const next = new URLSearchParams();
  const skip = new Set(omit);
  for (const key of PRESERVE_KEYS) {
    if (skip.has(key)) continue;
    const v = searchParams.get(key);
    if (v) next.set(key, v);
  }
  const operator = searchParams.get('operator') ?? searchParams.get('role');
  if (operator && !next.has('operator')) {
    next.set('operator', operator);
  }
  return next;
}

export function buildConsigneeHref(
  consignerRowId: string,
  searchParams: URLSearchParams,
): string {
  const next = copyEpassParamsFromSearch(searchParams);
  next.set('consignerRowId', consignerRowId);
  const qs = next.toString();
  return `/khanan/consignee${qs ? `?${qs}` : ''}`;
}

export function buildChalaanHref(
  searchParams: URLSearchParams,
  patch?: Record<string, string | null>,
): string {
  const next = copyEpassParamsFromSearch(searchParams, ['consignerRowId']);
  if (patch) {
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
  }
  const qs = next.toString();
  return `/khanan/chalaan${qs ? `?${qs}` : ''}`;
}

export function buildConsignerListHref(
  searchParams: URLSearchParams,
  patch?: Record<string, string | null>,
): string {
  const next = copyEpassParamsFromSearch(searchParams, ['consignerRowId']);
  if (patch) {
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
  }
  const qs = next.toString();
  return `/khanan/consigner${qs ? `?${qs}` : ''}`;
}

export function toConsignerOptionsQueryParams(
  filters: EpassBrowseFilterValues,
  resolvedSnapshotId: string | null,
): Record<string, string | undefined> {
  return {
    snapshotId: resolvedSnapshotId ?? undefined,
    dateMode: filters.dateMode === 'range' ? filters.dateMode : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    operator: filters.operator === 'all' ? undefined : filters.operator,
    mineral: serializeConsignerMinerals(filters.minerals),
    district: serializeDistricts(filters.districts) ?? undefined,
    consigner: filters.consignerSearch.trim() || undefined,
    hideZeroChallans: filters.hideZeroChallans ? '1' : undefined,
  };
}

export function toConsignerChallansQueryParams(
  filters: EpassBrowseFilterValues,
): Record<string, string | undefined> {
  return {
    snapshotId: filters.snapshotId || undefined,
    dateMode: filters.dateMode === 'range' ? filters.dateMode : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    consignee: filters.consigneeSearch.trim() || undefined,
    hideZeroPasses: filters.hideZeroPasses ? '1' : undefined,
  };
}

export function toChalaanListQueryParams(
  filters: EpassBrowseFilterValues,
  resolvedSnapshotId: string | null,
  sortKey: string | null,
  sortDir: 'asc' | 'desc',
  offset: number,
  limit: number,
): ChalaanListParams {
  return {
    snapshotId: resolvedSnapshotId ?? undefined,
    operator: filters.operator === 'all' ? undefined : filters.operator,
    district: serializeDistricts(filters.districts) ?? undefined,
    mineral: serializeConsignerMinerals(filters.minerals),
    consigner: filters.consignerSearch.trim() || undefined,
    consignee: filters.consigneeSearch.trim() || undefined,
    hideZeroPasses: filters.hideZeroPasses,
    sort: sortKey as ChalaanListParams['sort'],
    dir: sortKey ? sortDir : undefined,
    limit,
    offset,
  };
}
