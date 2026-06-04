import { apiFetch } from '@/lib/api';
import type { CrmVehicleExpiryListParams, CrmVehicleExpiryListResponse } from '@/lib/crm-types';

function appendCrmExpiryQuery(q: URLSearchParams, params: CrmVehicleExpiryListParams) {
  if (params.q) q.set('q', params.q);
  if (params.found === true) q.set('found', '1');
  if (params.found === false) q.set('found', '0');
  if (params.insuranceExpiryDays != null) {
    q.set('insuranceExpiryDays', String(params.insuranceExpiryDays));
  }
  if (params.rcExpiryDays != null) q.set('rcExpiryDays', String(params.rcExpiryDays));
  if (params.fitnessExpiryDays != null) {
    q.set('fitnessExpiryDays', String(params.fitnessExpiryDays));
  }
  if (params.grossWeightMin != null) q.set('grossWeightMin', String(params.grossWeightMin));
  if (params.grossWeightMax != null) q.set('grossWeightMax', String(params.grossWeightMax));
  if (params.vehicleClass) q.set('vehicleClass', params.vehicleClass);
  if (params.esimValidity) q.set('esimValidity', params.esimValidity);
  if (params.source && params.source !== 'all') q.set('source', params.source);
  if (params.status) q.set('status', params.status);
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
}

export function fetchCrmVehicleExpiryList(params: CrmVehicleExpiryListParams = {}) {
  const q = new URLSearchParams();
  appendCrmExpiryQuery(q, params);
  const qs = q.toString();
  return apiFetch<CrmVehicleExpiryListResponse>(`/crm/vehicle-expiry${qs ? `?${qs}` : ''}`);
}

export function addVehicleToCrmExpiry(vehicleRegNo: string) {
  return apiFetch<{ item: unknown; hasStatusRow: boolean }>('/crm/vehicle-expiry', {
    method: 'POST',
    body: JSON.stringify({ vehicleRegNo }),
  });
}

export function removeVehicleFromCrmExpiry(vehicleRegNo: string) {
  const encoded = encodeURIComponent(vehicleRegNo);
  return apiFetch<{ item: unknown }>(`/crm/vehicle-expiry/${encoded}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'removed' }),
  });
}

export function bulkRemoveVehiclesFromCrmExpiry(vehicleRegNos: string[]) {
  return apiFetch<{ removed: number; vehicleRegNos: string[] }>('/crm/vehicle-expiry/bulk-remove', {
    method: 'POST',
    body: JSON.stringify({ vehicleRegNos }),
  });
}
