import { buildChalaanFilterChips } from '@/components/khanan/ChalaanEpassFilters';
import { serializeConsignerMinerals } from '@/lib/epass-consigner-view';
import { serializeDistricts } from '@/lib/epass-district-view';
import { parseEpassFilterParams } from '@/lib/epass-filter-params';
import type {
  VehicleDataFilterValues,
  VehicleDataListParams,
  VehicleDataSortDir,
  VehicleDataSortKey,
} from '@/lib/epass-types';

export const VEHICLE_DATA_SORT_KEYS: VehicleDataSortKey[] = [
  'vehicle',
  'passes',
  'qty',
  'lastDate',
];

export function parseVehicleDataSortKey(value: string | null): VehicleDataSortKey | null {
  return VEHICLE_DATA_SORT_KEYS.includes(value as VehicleDataSortKey)
    ? (value as VehicleDataSortKey)
    : null;
}

export function parseVehicleDataSortDir(value: string | null): VehicleDataSortDir {
  return value === 'desc' ? 'desc' : 'asc';
}

export function parseVehicleDataFilters(searchParams: URLSearchParams): VehicleDataFilterValues {
  return {
    epass: parseEpassFilterParams(searchParams),
    vehicleSearch: searchParams.get('q')?.trim() ?? '',
  };
}

export function buildVehicleDataFilterChips(values: VehicleDataFilterValues): string[] {
  const chips = buildChalaanFilterChips(values.epass);
  if (values.vehicleSearch) chips.unshift(values.vehicleSearch);
  return chips;
}

export function toVehicleDataListQueryParams(
  filters: VehicleDataFilterValues,
  resolvedSnapshotId: string | null,
  sortKey: VehicleDataSortKey | null,
  sortDir: VehicleDataSortDir,
  offset: number,
  limit: number,
): VehicleDataListParams {
  const epass = filters.epass;
  return {
    snapshotId: resolvedSnapshotId ?? undefined,
    operator: epass.operator === 'all' ? undefined : epass.operator,
    district: serializeDistricts(epass.districts) ?? undefined,
    mineral: serializeConsignerMinerals(epass.minerals),
    consigner: epass.consignerSearch.trim() || undefined,
    consignee: epass.consigneeSearch.trim() || undefined,
    hideZeroPasses: epass.hideZeroPasses,
    q: filters.vehicleSearch.trim() || undefined,
    sort: sortKey ?? 'vehicle',
    dir: sortKey ? sortDir : undefined,
    limit,
    offset,
  };
}

export function toVehicleDataDetailQueryParams(
  filters: VehicleDataFilterValues,
  resolvedSnapshotId: string | null,
): Omit<VehicleDataListParams, 'limit' | 'offset' | 'sort' | 'dir'> {
  const epass = filters.epass;
  return {
    snapshotId: resolvedSnapshotId ?? undefined,
    operator: epass.operator === 'all' ? undefined : epass.operator,
    district: serializeDistricts(epass.districts) ?? undefined,
    mineral: serializeConsignerMinerals(epass.minerals),
    consigner: epass.consignerSearch.trim() || undefined,
    consignee: epass.consigneeSearch.trim() || undefined,
    hideZeroPasses: epass.hideZeroPasses,
    q: filters.vehicleSearch.trim() || undefined,
  };
}

export function formatVehicleDataPreview(values: string[], max = 2): string {
  if (values.length === 0) return '—';
  if (values.length <= max) return values.join(', ');
  return `${values.slice(0, max).join(', ')} +${values.length - max}`;
}

export function formatVehicleDataQty(
  totalQuantity: number | null,
  quantityByUnit: Record<string, number>,
): string {
  const units = Object.keys(quantityByUnit);
  if (units.length === 0) return '—';
  if (units.length === 1) {
    const unit = units[0] === '—' ? '' : ` ${units[0]}`;
    const qty = quantityByUnit[units[0]];
    return `${qty}${unit}`.trim();
  }
  return 'Mixed';
}
