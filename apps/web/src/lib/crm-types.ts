import type { VehicleStatusSortDir, VehicleStatusSortKey } from '@/lib/epass-types';

export type CrmExpirySource = 'auto' | 'manual' | 'both';
export type CrmExpiryStatus = 'active' | 'removed';
export type CrmExpirySourceFilter = 'all' | 'auto' | 'manual';

export interface CrmVehicleExpiryListItemDto {
  id: string;
  vehicleRegNo: string;
  ksRegNo: string | null;
  vehicleClass: string | null;
  rcFitUpTo: string | null;
  rcTaxUpTo: string | null;
  insuranceUpTo: string | null;
  puccUpTo: string | null;
  imeiNo: string | null;
  esimValidity: string | null;
  grossWeightMt: number | null;
  unladenWeightMt: number | null;
  found: boolean;
  insuranceDaysLeft: number | null;
  rcDaysLeft: number | null;
  fitnessDaysLeft: number | null;
  scrapedAt: string;
  crmSource: CrmExpirySource;
  crmStatus: CrmExpiryStatus;
  crmEntryId: string | null;
  notes: string | null;
}

export interface CrmExpiryStatsDto {
  totalInQueue: number;
  autoCount: number;
  manualCount: number;
  lastScrapedAt: string | null;
}

export interface CrmVehicleExpiryListResponse {
  total: number;
  limit: number;
  offset: number;
  items: CrmVehicleExpiryListItemDto[];
  stats: CrmExpiryStatsDto;
}

export type CrmExpiryFoundFilter = 'all' | 'found' | 'notFound';

export interface CrmExpiryFilterValues {
  search: string;
  found: CrmExpiryFoundFilter;
  insuranceExpiryDays: string;
  rcExpiryDays: string;
  fitnessExpiryDays: string;
  grossWeightMin: string;
  grossWeightMax: string;
  vehicleClass: string;
  esimValidity: string;
  source: CrmExpirySourceFilter;
  status: CrmExpiryStatus;
}

export type CrmExpirySortKey = VehicleStatusSortKey | 'crmSource';

export interface CrmVehicleExpiryListParams {
  q?: string;
  found?: boolean;
  insuranceExpiryDays?: number;
  rcExpiryDays?: number;
  fitnessExpiryDays?: number;
  grossWeightMin?: number;
  grossWeightMax?: number;
  vehicleClass?: string;
  esimValidity?: string;
  source?: CrmExpirySourceFilter;
  status?: CrmExpiryStatus;
  sort?: CrmExpirySortKey;
  dir?: VehicleStatusSortDir;
  limit?: number;
  offset?: number;
}
