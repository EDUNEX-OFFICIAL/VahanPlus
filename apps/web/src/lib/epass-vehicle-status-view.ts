import type { VehicleStatusFilterValues, VehicleStatusFoundFilter } from '@/lib/epass-types';

export function parseVehicleStatusFoundFilter(
  raw: string | null,
): VehicleStatusFoundFilter {
  if (raw === '1' || raw === 'found' || raw === 'true') return 'found';
  if (raw === '0' || raw === 'notFound' || raw === 'false') return 'notFound';
  return 'all';
}

export function serializeVehicleStatusFoundFilter(
  found: VehicleStatusFoundFilter,
): string | null {
  if (found === 'found') return '1';
  if (found === 'notFound') return '0';
  return null;
}

export function parseVehicleStatusFilters(searchParams: URLSearchParams): VehicleStatusFilterValues {
  return {
    search: searchParams.get('q')?.trim() ?? '',
    found: parseVehicleStatusFoundFilter(searchParams.get('found')),
  };
}

export function buildVehicleStatusFilterChips(values: VehicleStatusFilterValues): string[] {
  const chips: string[] = [];
  if (values.search) chips.push(values.search);
  if (values.found === 'found') chips.push('Found on portal');
  if (values.found === 'notFound') chips.push('Not found on portal');
  return chips;
}
