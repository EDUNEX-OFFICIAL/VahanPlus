import type {
  CrmExpiryFilterValues,
  CrmExpiryFoundFilter,
  CrmExpirySourceFilter,
  CrmExpiryStatus,
} from '@/lib/crm-types';

export const DEFAULT_CRM_EXPIRY_DAYS = '30';

export function parseCrmExpiryFilters(searchParams: URLSearchParams): CrmExpiryFilterValues {
  const foundRaw = searchParams.get('found');
  let found: CrmExpiryFoundFilter = 'all';
  if (foundRaw === 'found') found = 'found';
  if (foundRaw === 'notFound') found = 'notFound';

  const statusRaw = searchParams.get('status');
  const status: CrmExpiryStatus = statusRaw === 'removed' ? 'removed' : 'active';

  const sourceRaw = searchParams.get('source');
  let source: CrmExpirySourceFilter = 'all';
  if (sourceRaw === 'auto' || sourceRaw === 'manual') source = sourceRaw;

  return {
    search: searchParams.get('q') ?? '',
    found,
    insuranceExpiryDays: searchParams.get('insuranceExpiryDays') ?? DEFAULT_CRM_EXPIRY_DAYS,
    rcExpiryDays: searchParams.get('rcExpiryDays') ?? DEFAULT_CRM_EXPIRY_DAYS,
    fitnessExpiryDays: searchParams.get('fitnessExpiryDays') ?? DEFAULT_CRM_EXPIRY_DAYS,
    grossWeightMin: searchParams.get('grossWeightMin') ?? '',
    grossWeightMax: searchParams.get('grossWeightMax') ?? '',
    vehicleClass: searchParams.get('vehicleClass') ?? '',
    esimValidity: searchParams.get('esimValidity') ?? '',
    source,
    status,
  };
}

export function serializeCrmExpiryFoundFilter(found: CrmExpiryFoundFilter): string | null {
  if (found === 'found') return 'found';
  if (found === 'notFound') return 'notFound';
  return null;
}

export function buildCrmExpiryFilterChips(values: CrmExpiryFilterValues): string[] {
  const chips: string[] = [];
  if (values.search.trim()) chips.push(`Search: ${values.search.trim()}`);
  if (values.found !== 'all') chips.push(values.found === 'found' ? 'On portal' : 'No portal data');
  if (values.status === 'removed') chips.push('Removed');
  if (values.source !== 'all') chips.push(`Source: ${values.source}`);
  const ins = values.insuranceExpiryDays.trim();
  const rc = values.rcExpiryDays.trim();
  const fit = values.fitnessExpiryDays.trim();
  if (ins && ins === rc && ins === fit) {
    chips.push(`Any expiry ≤ ${ins}d`);
  } else {
    if (ins) chips.push(`Insurance ≤ ${ins}d`);
    if (rc) chips.push(`RC tax ≤ ${rc}d`);
    if (fit) chips.push(`Fitness ≤ ${fit}d`);
  }
  if (values.vehicleClass.trim()) chips.push(`Class: ${values.vehicleClass.trim()}`);
  if (values.esimValidity.trim()) chips.push(`eSIM: ${values.esimValidity.trim()}`);
  if (values.grossWeightMin.trim()) chips.push(`Gross min ${values.grossWeightMin}`);
  if (values.grossWeightMax.trim()) chips.push(`Gross max ${values.grossWeightMax}`);
  return chips;
}

export function daysLeftTone(value: number | null): string {
  if (value == null) return 'text-text-secondary';
  if (value < 0) return 'text-rose-300';
  if (value <= 30) return 'text-amber-300';
  return 'text-text-secondary';
}

export function formatDaysLeft(value: number | null): string {
  if (value == null) return '—';
  return String(value);
}
