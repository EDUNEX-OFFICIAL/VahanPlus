import type { ChallanSortDir, ChallanSortKey } from '@/lib/epass-types';

export const CHALLAN_SORT_KEYS: ChallanSortKey[] = [
  'consignee',
  'challanNo',
  'mineral',
  'vehicle',
  'destination',
  'date',
  'qty',
  'status',
  'slNo',
];

export function parseChallanSortKey(value: string | null): ChallanSortKey | null {
  return CHALLAN_SORT_KEYS.includes(value as ChallanSortKey) ? (value as ChallanSortKey) : null;
}

export function parseChallanSortDir(value: string | null): ChallanSortDir {
  return value === 'desc' ? 'desc' : 'asc';
}
