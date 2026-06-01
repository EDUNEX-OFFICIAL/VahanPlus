import type { DistrictFilterValues } from '@/components/khanan/DistrictEpassFilters';
import type {
  EpassDistrictRowDto,
  MineralAggregateRow,
  OperatorTypeFilter,
} from '@/lib/epass-types';

export function filterDistrictRowsForMineral(
  rows: EpassDistrictRowDto[],
  filters: Pick<DistrictFilterValues, 'minerals' | 'districts' | 'hideZeroPasses'>,
): EpassDistrictRowDto[] {
  const selectedDistricts = filters.districts?.filter((d) => d.trim()) ?? [];
  const selectedMinerals = filters.minerals?.filter((m) => m.trim()) ?? [];

  return rows.filter((row) => {
    if (selectedDistricts.length > 0) {
      const districtSet = new Set(selectedDistricts.map((d) => d.toLowerCase()));
      if (!districtSet.has(row.dmoName.toLowerCase())) return false;
    }
    if (selectedMinerals.length > 0) {
      const rowMinerals = [row.lesseeMineral, row.dealerMineral].filter(Boolean) as string[];
      const rowSet = new Set(rowMinerals.map((m) => m.toLowerCase()));
      const hasMatch = selectedMinerals.some((m) => rowSet.has(m.toLowerCase()));
      if (!hasMatch) return false;
    }
    if (filters.hideZeroPasses && row.totalPasses <= 0) return false;
    return true;
  });
}

export type MineralSortKey = 'mineral' | 'totalPasses' | 'lesseePasses' | 'dealerPasses';
export type MineralSortDir = 'asc' | 'desc';

export function sortMineralRows(
  rows: MineralAggregateRow[],
  sortKey: MineralSortKey | null,
  sortDir: MineralSortDir,
): MineralAggregateRow[] {
  if (!sortKey) return rows;
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sortKey) {
      case 'mineral':
        return a.mineral.localeCompare(b.mineral, undefined, { sensitivity: 'base' }) * dir;
      case 'lesseePasses':
        return (a.lessee.passes - b.lessee.passes) * dir;
      case 'dealerPasses':
        return (a.dealer.passes - b.dealer.passes) * dir;
      case 'totalPasses':
      default:
        return (a.totalPasses - b.totalPasses) * dir;
    }
  });
}

export function parseMineralSortKey(value: string | null): MineralSortKey | null {
  const keys: MineralSortKey[] = ['mineral', 'totalPasses', 'lesseePasses', 'dealerPasses'];
  return keys.includes(value as MineralSortKey) ? (value as MineralSortKey) : null;
}

export function operatorShowsLessee(operator: OperatorTypeFilter): boolean {
  return operator === 'all' || operator === 'lessee';
}

export function operatorShowsDealer(operator: OperatorTypeFilter): boolean {
  return operator === 'all' || operator === 'dealer';
}
