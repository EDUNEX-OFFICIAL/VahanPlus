import type { ChalaanSortDir, ChalaanSortKey } from '@/lib/epass-types';

export const CHALAAN_SORT_KEYS: ChalaanSortKey[] = [
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

export function parseChalaanSortKey(value: string | null): ChalaanSortKey | null {
  return CHALAAN_SORT_KEYS.includes(value as ChalaanSortKey) ? (value as ChalaanSortKey) : null;
}

export function parseChalaanSortDir(value: string | null): ChalaanSortDir {
  return value === 'desc' ? 'desc' : 'asc';
}
