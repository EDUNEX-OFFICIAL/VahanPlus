import { apiFetch } from '@/lib/api';
import type {
  ChalaanListParams,
  ChalaanListResponse,
  ChalaanPassListResponse,
  ChalaanPassesResponse,
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
  LatestEpassResponse,
  OperatorType,
  SnapshotDistrictRowsResponse,
} from '@/lib/epass-types';

export const EPASS_LATEST_QUERY_KEY = ['epass', 'latest'] as const;
export const EPASS_SNAPSHOTS_QUERY_KEY = ['epass', 'snapshots'] as const;

export function fetchLatestEpass(token: string) {
  return apiFetch<LatestEpassResponse>('/epass/latest', { token });
}

export function fetchEpassSnapshots(token: string, limit = 100) {
  return apiFetch<EpassSnapshotListResponse>(`/epass/snapshots?limit=${limit}`, { token });
}

export function fetchSnapshotDistrictRows(token: string, snapshotId: string) {
  return apiFetch<SnapshotDistrictRowsResponse>(`/epass/snapshots/${snapshotId}/rows`, {
    token,
  });
}

export function fetchDistrictConsigners(
  token: string,
  districtRowId: string,
  operatorType: OperatorType,
) {
  const q = new URLSearchParams({ operator: operatorType });
  return apiFetch<DistrictConsignersResponse>(
    `/epass/district-rows/${districtRowId}/consigners?${q}`,
    { token },
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
  token: string,
  consignerRowId: string,
  params: ConsignerChallansParams = {},
) {
  const q = new URLSearchParams();
  appendBrowseQuery(q, params as EpassBrowseQueryParams);
  const qs = q.toString();
  return apiFetch<ConsignerChallansResponse>(
    `/epass/consigners/${consignerRowId}/challans${qs ? `?${qs}` : ''}`,
    { token },
  );
}

export function fetchConsignerList(token: string, params: ConsignerListParams = {}) {
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
  return apiFetch<ConsignerListResponse>(`/epass/consigners${qs ? `?${qs}` : ''}`, { token });
}

export function fetchConsignerOptions(token: string, params: ConsignerOptionsParams = {}) {
  const q = new URLSearchParams();
  appendBrowseQuery(q, params as EpassBrowseQueryParams);
  const qs = q.toString();
  return apiFetch<ConsignerOptionsResponse>(`/epass/consigners/options${qs ? `?${qs}` : ''}`, {
    token,
  });
}

export function fetchChalaanList(token: string, params: ChalaanListParams = {}) {
  const q = new URLSearchParams();
  if (params.snapshotId) q.set('snapshotId', params.snapshotId);
  if (params.operator) q.set('operator', params.operator);
  const district = params.district ?? params.dmo;
  if (district) q.set('district', district);
  if (params.mineral) q.set('mineral', params.mineral);
  if (params.consigner) q.set('consigner', params.consigner);
  if (params.consignee) q.set('consignee', params.consignee);
  if (params.hideZeroPasses) q.set('hideZeroPasses', '1');
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<ChalaanListResponse>(`/epass/chalaans${qs ? `?${qs}` : ''}`, { token });
}

export function fetchChalaanPassList(token: string, params: ChalaanListParams = {}) {
  const q = new URLSearchParams();
  if (params.snapshotId) q.set('snapshotId', params.snapshotId);
  if (params.operator) q.set('operator', params.operator);
  const district = params.district ?? params.dmo;
  if (district) q.set('district', district);
  if (params.mineral) q.set('mineral', params.mineral);
  if (params.consigner) q.set('consigner', params.consigner);
  if (params.consignee) q.set('consignee', params.consignee);
  if (params.hideZeroPasses) q.set('hideZeroPasses', '1');
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<ChalaanPassListResponse>(`/epass/chalaan-passes${qs ? `?${qs}` : ''}`, { token });
}

export function fetchChalaanPasses(token: string, challanRowId: string) {
  return apiFetch<ChalaanPassesResponse>(`/epass/chalaans/${challanRowId}/passes`, { token });
}

export function fetchVehicleStatusList(token: string, params: VehicleStatusListParams = {}) {
  const q = new URLSearchParams();
  if (params.q) q.set('q', params.q);
  if (params.found === true) q.set('found', '1');
  if (params.found === false) q.set('found', '0');
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<VehicleStatusListResponse>(`/epass/vehicle-status${qs ? `?${qs}` : ''}`, {
    token,
  });
}

export function scrapeMissingVehicleStatus(token: string, limit = 100) {
  const q = limit > 0 ? `?limit=${limit}` : '';
  return apiFetch<VehicleStatusScrapeMissingResponse>(`/epass/vehicle-status/scrape-missing${q}`, {
    token,
    method: 'POST',
  });
}
