import {
  parseConsignerMineralsParam,
  serializeConsignerMinerals,
} from '@/lib/epass-consigner-view';
import { parseDistrictsParam, serializeDistricts } from '@/lib/epass-district-view';
import type { ChalaanListParams, EpassBrowseFilterValues } from '@/lib/epass-types';
import { normalizeDateRange, type EpassDateMode } from '@/lib/epass-report-date';
import { effectiveReportScopeFromSearchParams } from '@/lib/epass-report-scope';
import { parseOperatorParam } from '@/lib/operator';

export type { EpassBrowseFilterValues, EpassDateMode };

const PRESERVE_KEYS = [
  'snapshotId',
  'reportDate',
  'reportScope',
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
  'destination',
  'challan',
] as const;

export function parseEpassFilterParams(searchParams: URLSearchParams): EpassBrowseFilterValues {
  const districtRaw = searchParams.get('district') ?? searchParams.get('dmo') ?? '';
  const reportScope = effectiveReportScopeFromSearchParams(searchParams);
  return {
    operator: parseOperatorParam(searchParams.get('operator'), searchParams.get('role')),
    minerals: parseConsignerMineralsParam(searchParams.get('mineral')),
    dateMode: searchParams.get('dateMode') === 'range' ? 'range' : 'specific',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    reportDate: reportScope === 'all' ? '' : (searchParams.get('reportDate') ?? ''),
    snapshotId: reportScope === 'all' ? '' : (searchParams.get('snapshotId') ?? ''),
    reportScope,
    districts: parseDistrictsParam(districtRaw),
    consignerSearch: searchParams.get('consigner') ?? '',
    hideZeroChallans: searchParams.get('hideZeroChallans') === '1',
    consigneeSearch: searchParams.get('consignee') ?? '',
    hideZeroPasses: searchParams.get('hideZeroPasses') === '1',
    consignerRowId: searchParams.get('consignerRowId') ?? '',
    destination: searchParams.get('destination') ?? '',
    challanSearch: searchParams.get('challan') ?? '',
  };
}

export function serializeEpassFilterParams(
  filters: EpassBrowseFilterValues,
  extra?: Record<string, string | null>,
): Record<string, string | null> {
  const isRange = filters.dateMode === 'range';
  const normalized = isRange
    ? normalizeDateRange(filters.dateFrom, filters.dateTo)
    : { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
  const rangeActive = isRange && (normalized.dateFrom || normalized.dateTo);
  const isAllScope = filters.reportScope === 'all' && !rangeActive;

  return {
    reportScope: isAllScope ? 'all' : null,
    snapshotId: rangeActive || isAllScope ? null : filters.snapshotId || null,
    reportDate: rangeActive || isAllScope ? null : filters.reportDate || null,
    dateMode: filters.dateMode === 'specific' ? null : filters.dateMode,
    dateFrom: normalized.dateFrom || null,
    dateTo: normalized.dateTo || null,
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
    destination: filters.destination.trim() || null,
    challan: filters.challanSearch.trim() || null,
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

export function buildConsigneeHref(consignerRowId: string, searchParams: URLSearchParams): string {
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
  const isAllScope = filters.reportScope === 'all' && filters.dateMode !== 'range';
  return {
    reportScope: isAllScope ? 'all' : undefined,
    snapshotId: isAllScope ? undefined : (resolvedSnapshotId ?? undefined),
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
  const isAllScope = filters.reportScope === 'all' && filters.dateMode !== 'range';
  return {
    reportScope: isAllScope ? 'all' : undefined,
    snapshotId: isAllScope ? undefined : filters.snapshotId || undefined,
    dateMode: filters.dateMode === 'range' ? filters.dateMode : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    consignee: filters.consigneeSearch.trim() || undefined,
    destination: filters.destination.trim() || undefined,
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
  const normalized =
    filters.dateMode === 'range'
      ? normalizeDateRange(filters.dateFrom, filters.dateTo)
      : { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
  const isRange = filters.dateMode === 'range' && (normalized.dateFrom || normalized.dateTo);
  const isAllScope = filters.reportScope === 'all' && !isRange;
  return {
    reportScope: isAllScope ? 'all' : undefined,
    snapshotId: isRange || isAllScope ? undefined : (resolvedSnapshotId ?? undefined),
    dateMode: isRange ? 'range' : undefined,
    dateFrom: isRange ? normalized.dateFrom || undefined : undefined,
    dateTo: isRange ? normalized.dateTo || normalized.dateFrom || undefined : undefined,
    operator: filters.operator === 'all' ? undefined : filters.operator,
    district: serializeDistricts(filters.districts) ?? undefined,
    mineral: serializeConsignerMinerals(filters.minerals),
    consigner: filters.consignerSearch.trim() || undefined,
    consignee: filters.consigneeSearch.trim() || undefined,
    destination: filters.destination.trim() || undefined,
    challan: filters.challanSearch.trim() || undefined,
    hideZeroPasses: filters.hideZeroPasses,
    sort: sortKey as ChalaanListParams['sort'],
    dir: sortKey ? sortDir : undefined,
    limit,
    offset,
  };
}
