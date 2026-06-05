import { buildChalaanFilterChips } from '@/components/khanan/ChalaanEpassFilters';
import { serializeConsignerMinerals } from '@/lib/epass-consigner-view';
import { serializeDistricts } from '@/lib/epass-district-view';
import { parseEpassFilterParams } from '@/lib/epass-filter-params';
import { mcvPortalStatusLabel } from '@/lib/mcv-portal-status';
import type {
  McvPortalStatus,
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
  'grossWeight',
  'unladen',
];

const MCV_PORTAL_STATUSES: McvPortalStatus[] = ['on_portal', 'no_portal_data', 'not_checked'];

export function parseVehicleDataSortKey(value: string | null): VehicleDataSortKey | null {
  return VEHICLE_DATA_SORT_KEYS.includes(value as VehicleDataSortKey)
    ? (value as VehicleDataSortKey)
    : null;
}

export function parseVehicleDataSortDir(value: string | null): VehicleDataSortDir {
  return value === 'desc' ? 'desc' : 'asc';
}

export function parsePortalStatusParam(value: string | null): McvPortalStatus | 'all' {
  if (!value) return 'all';
  return MCV_PORTAL_STATUSES.includes(value as McvPortalStatus)
    ? (value as McvPortalStatus)
    : 'all';
}

export function parseVehicleDataFilters(searchParams: URLSearchParams): VehicleDataFilterValues {
  const reportScope = searchParams.get('reportScope') === 'all' ? 'all' : 'specific';
  return {
    epass: parseEpassFilterParams(searchParams),
    vehicleSearch: searchParams.get('q')?.trim() ?? '',
    reportScope,
    portalStatus: parsePortalStatusParam(searchParams.get('portalStatus')),
  };
}

export function buildVehicleDataFilterChips(values: VehicleDataFilterValues): string[] {
  const chips = buildChalaanFilterChips(values.epass, {
    reportScope: values.reportScope,
  });
  if (values.portalStatus !== 'all') {
    chips.push(`Portal: ${mcvPortalStatusLabel(values.portalStatus)}`);
  }
  if (values.vehicleSearch) chips.unshift(values.vehicleSearch);
  return chips;
}

function sharedVehicleDataQueryFields(
  filters: VehicleDataFilterValues,
  resolvedSnapshotId: string | null,
): Omit<VehicleDataListParams, 'limit' | 'offset' | 'sort' | 'dir'> {
  const epass = filters.epass;
  const isAll = filters.reportScope === 'all';
  return {
    reportScope: isAll ? 'all' : undefined,
    snapshotId: isAll ? undefined : (resolvedSnapshotId ?? undefined),
    dateMode: epass.dateMode === 'range' ? 'range' : undefined,
    dateFrom: epass.dateFrom || undefined,
    dateTo: epass.dateTo || undefined,
    operator: epass.operator === 'all' ? undefined : epass.operator,
    district: serializeDistricts(epass.districts) ?? undefined,
    mineral: serializeConsignerMinerals(epass.minerals),
    consigner: epass.consignerSearch.trim() || undefined,
    consignee: epass.consigneeSearch.trim() || undefined,
    hideZeroPasses: epass.hideZeroPasses,
    portalStatus: filters.portalStatus !== 'all' ? filters.portalStatus : undefined,
    q: filters.vehicleSearch.trim() || undefined,
  };
}

export function toVehicleDataListQueryParams(
  filters: VehicleDataFilterValues,
  resolvedSnapshotId: string | null,
  sortKey: VehicleDataSortKey | null,
  sortDir: VehicleDataSortDir,
  offset: number,
  limit: number,
): VehicleDataListParams {
  const defaultSort = filters.reportScope === 'all' ? 'lastDate' : 'vehicle';
  const defaultDir = filters.reportScope === 'all' ? 'desc' : 'asc';
  return {
    ...sharedVehicleDataQueryFields(filters, resolvedSnapshotId),
    sort: sortKey ?? defaultSort,
    dir: sortKey ? sortDir : defaultDir,
    limit,
    offset,
  };
}

export function toVehicleDataDetailQueryParams(
  filters: VehicleDataFilterValues,
  resolvedSnapshotId: string | null,
): Omit<VehicleDataListParams, 'limit' | 'offset' | 'sort' | 'dir'> {
  return sharedVehicleDataQueryFields(filters, resolvedSnapshotId);
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
