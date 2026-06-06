import { apiFetch } from '@/lib/api';
import type {
  ChalaanListParams,
  ChalaanListResponse,
  ChalaanPassListResponse,
  ChalaanPassesResponse,
  EpassFilterOptionsResponse,
  VehicleDataDetailResponse,
  VehicleDataListParams,
  VehicleDataListResponse,
  VehicleStatusEnqueueResponse,
  VehicleStatusListParams,
  VehicleStatusListResponse,
  VehicleStatusScrapeMissingResponse,
  ConsignerChallansParams,
  ConsignerChallansResponse,
  ConsignerListParams,
  ConsignerListResponse,
  ConsignerOptionsParams,
  ConsignerOptionsResponse,
  DistrictConsignersResponse,
  EpassSnapshotListResponse,
  EpassSnapshotReportDatesResponse,
  LatestEpassResponse,
  OperatorType,
  SnapshotDistrictRowsResponse,
} from '@/lib/epass-types';

export const EPASS_LATEST_QUERY_KEY = ['epass', 'latest'] as const;
export const EPASS_SNAPSHOTS_QUERY_KEY = ['epass', 'snapshots'] as const;
export const EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY = ['epass', 'snapshot-report-dates'] as const;

export function fetchLatestEpass() {
  return apiFetch<LatestEpassResponse>('/epass/latest');
}

export function fetchEpassSnapshots(limit = 100) {
  return apiFetch<EpassSnapshotListResponse>(`/epass/snapshots?limit=${limit}`);
}

export function fetchEpassSnapshotReportDates() {
  return apiFetch<EpassSnapshotReportDatesResponse>('/epass/snapshots/report-dates');
}

export function fetchSnapshotDistrictRows(snapshotId: string) {
  return apiFetch<SnapshotDistrictRowsResponse>(`/epass/snapshots/${snapshotId}/rows`);
}

export function fetchDistrictConsigners(districtRowId: string, operatorType: OperatorType) {
  const q = new URLSearchParams({ operator: operatorType });
  return apiFetch<DistrictConsignersResponse>(
    `/epass/district-rows/${districtRowId}/consigners?${q}`,
  );
}

type EpassBrowseQueryParams = ConsignerOptionsParams & ConsignerChallansParams;

function appendBrowseQuery(q: URLSearchParams, params: EpassBrowseQueryParams) {
  if (params.snapshotId) q.set('snapshotId', params.snapshotId);
  if (params.dateMode) q.set('dateMode', params.dateMode);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  const operator = params.operator ?? params.role;
  if (operator) q.set('operator', operator);
  if (params.district) q.set('district', params.district);
  if (params.mineral) q.set('mineral', params.mineral);
  if (params.consigner) q.set('consigner', params.consigner);
  if (params.hideZeroChallans) q.set('hideZeroChallans', '1');
  if (params.consignee) q.set('consignee', params.consignee);
  if (params.hideZeroPasses) q.set('hideZeroPasses', '1');
}

export function fetchConsignerChallans(
  consignerRowId: string,
  params: ConsignerChallansParams = {},
) {
  const q = new URLSearchParams();
  appendBrowseQuery(q, params as EpassBrowseQueryParams);
  const qs = q.toString();
  return apiFetch<ConsignerChallansResponse>(
    `/epass/consigners/${consignerRowId}/challans${qs ? `?${qs}` : ''}`,
  );
}

export function fetchConsignerList(params: ConsignerListParams = {}) {
  const q = new URLSearchParams();
  if (params.snapshotId) q.set('snapshotId', params.snapshotId);
  const operator = params.operator ?? params.role;
  if (operator) q.set('operator', operator);
  const district = params.district ?? params.dmo;
  if (district) q.set('district', district);
  if (params.mineral) q.set('mineral', params.mineral);
  if (params.consigner) q.set('consigner', params.consigner);
  if (params.hideZeroChallans) q.set('hideZeroChallans', '1');
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<ConsignerListResponse>(`/epass/consigners${qs ? `?${qs}` : ''}`);
}

export function fetchConsignerOptions(params: ConsignerOptionsParams = {}) {
  const q = new URLSearchParams();
  appendBrowseQuery(q, params as EpassBrowseQueryParams);
  const qs = q.toString();
  return apiFetch<ConsignerOptionsResponse>(`/epass/consigners/options${qs ? `?${qs}` : ''}`);
}

export function fetchChalaanList(params: ChalaanListParams = {}) {
  const q = new URLSearchParams();
  if (params.snapshotId) q.set('snapshotId', params.snapshotId);
  if (params.operator) q.set('operator', params.operator);
  const district = params.district ?? params.dmo;
  if (district) q.set('district', district);
  if (params.mineral) q.set('mineral', params.mineral);
  if (params.consigner) q.set('consigner', params.consigner);
  if (params.consignee) q.set('consignee', params.consignee);
  if (params.destination) q.set('destination', params.destination);
  if (params.hideZeroPasses) q.set('hideZeroPasses', '1');
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<ChalaanListResponse>(`/epass/chalaans${qs ? `?${qs}` : ''}`);
}

export function fetchChalaanPassList(params: ChalaanListParams = {}) {
  const q = new URLSearchParams();
  appendChalaanBrowseQuery(q, params);
  if (params.destination) q.set('destination', params.destination);
  if (params.challan) q.set('challan', params.challan);
  const qs = q.toString();
  return apiFetch<ChalaanPassListResponse>(`/epass/chalaan-passes${qs ? `?${qs}` : ''}`);
}

export function fetchChalaanPasses(challanRowId: string) {
  return apiFetch<ChalaanPassesResponse>(`/epass/chalaans/${challanRowId}/passes`);
}

export function updateConsignerGhatNumber(consignerRowId: string, ghatNumber: string) {
  return apiFetch<{ item: unknown }>(`/epass/consigners/${consignerRowId}/ghat-number`, {
    method: 'PATCH',
    body: JSON.stringify({ ghatNumber }),
  });
}

/** @deprecated Use updateConsignerGhatNumber */
export function updateChallanGhatNumber(challanRowId: string, ghatNumber: string) {
  return apiFetch<{ item: unknown }>(`/epass/challans/${challanRowId}/ghat-number`, {
    method: 'PATCH',
    body: JSON.stringify({ ghatNumber }),
  });
}

type EpassPassBrowseQueryParams = {
  snapshotId?: string;
  reportScope?: 'all';
  dateMode?: 'specific' | 'range';
  dateFrom?: string;
  dateTo?: string;
  operator?: ChalaanListParams['operator'];
  district?: string;
  dmo?: string;
  mineral?: string;
  consigner?: string;
  consignee?: string;
  hideZeroPasses?: boolean;
  portalStatus?: string;
  q?: string;
  sort?: string;
  dir?: string;
  limit?: number;
  offset?: number;
};

function appendChalaanBrowseQuery(q: URLSearchParams, params: EpassPassBrowseQueryParams) {
  if (params.reportScope === 'all') q.set('reportScope', 'all');
  else if (params.snapshotId) q.set('snapshotId', params.snapshotId);
  if (params.dateMode === 'range') q.set('dateMode', 'range');
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.operator) q.set('operator', params.operator);
  const district = params.district ?? params.dmo;
  if (district) q.set('district', district);
  if (params.mineral) q.set('mineral', params.mineral);
  if (params.consigner) q.set('consigner', params.consigner);
  if (params.consignee) q.set('consignee', params.consignee);
  if (params.hideZeroPasses) q.set('hideZeroPasses', '1');
  if (params.portalStatus) q.set('portalStatus', params.portalStatus);
  if (params.q) q.set('q', params.q);
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
}

export function fetchVehicleDataList(params: VehicleDataListParams = {}) {
  const q = new URLSearchParams();
  appendChalaanBrowseQuery(q, params);
  const qs = q.toString();
  return apiFetch<VehicleDataListResponse>(`/epass/vehicle-data${qs ? `?${qs}` : ''}`);
}

export function fetchVehicleDataDetail(
  vehicleRegNo: string,
  params: Omit<VehicleDataListParams, 'limit' | 'offset' | 'sort' | 'dir'> = {},
) {
  const q = new URLSearchParams();
  appendChalaanBrowseQuery(q, params);
  const encoded = encodeURIComponent(vehicleRegNo);
  const qs = q.toString();
  return apiFetch<VehicleDataDetailResponse>(`/epass/vehicle-data/${encoded}${qs ? `?${qs}` : ''}`);
}

export function fetchVehicleStatusList(params: VehicleStatusListParams = {}) {
  const q = new URLSearchParams();
  if (params.q) q.set('q', params.q);
  if (params.found === true) q.set('found', '1');
  if (params.found === false) q.set('found', '0');
  if (params.insuranceExpiryDays != null)
    q.set('insuranceExpiryDays', String(params.insuranceExpiryDays));
  if (params.rcExpiryDays != null) q.set('rcExpiryDays', String(params.rcExpiryDays));
  if (params.fitnessExpiryDays != null)
    q.set('fitnessExpiryDays', String(params.fitnessExpiryDays));
  if (params.grossWeightMin != null) q.set('grossWeightMin', String(params.grossWeightMin));
  if (params.grossWeightMax != null) q.set('grossWeightMax', String(params.grossWeightMax));
  if (params.vehicleClass) q.set('vehicleClass', params.vehicleClass);
  if (params.esimValidity) q.set('esimValidity', params.esimValidity);
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.includeCrm) q.set('includeCrm', '1');
  const qs = q.toString();
  return apiFetch<VehicleStatusListResponse>(`/epass/vehicle-status${qs ? `?${qs}` : ''}`);
}

export function scrapeMissingVehicleStatus(limit = 100) {
  const q = limit > 0 ? `?limit=${limit}` : '';
  return apiFetch<VehicleStatusScrapeMissingResponse>(`/epass/vehicle-status/scrape-missing${q}`, {
    method: 'POST',
  });
}

export function fetchEpassFilterOptions(
  params: Pick<
    VehicleDataListParams,
    'reportScope' | 'dateMode' | 'dateFrom' | 'dateTo' | 'snapshotId'
  > = { reportScope: 'all' },
) {
  const q = new URLSearchParams();
  q.set('reportScope', 'all');
  if (params.dateMode === 'range') q.set('dateMode', 'range');
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.snapshotId) q.set('snapshotId', params.snapshotId);
  return apiFetch<EpassFilterOptionsResponse>(`/epass/filter-options?${q.toString()}`);
}

export function enqueueVehicleStatusScrape(vehicleRegNo: string) {
  return apiFetch<VehicleStatusEnqueueResponse>('/epass/vehicle-status/enqueue', {
    method: 'POST',
    body: JSON.stringify({ vehicleRegNo }),
  });
}
