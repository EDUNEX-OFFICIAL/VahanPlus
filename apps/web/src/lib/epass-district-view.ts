import type {
  ConsignerScrapeStatus,
  DistrictFlatRow,
  DistrictOperatorFilter,
  DistrictSortDir,
  DistrictSortKey,
  DistrictViewFilters,
  EpassDistrictRowDto,
} from '@/lib/epass-types';

type GroupAcc = {
  district: string;
  slNo: number;
  districtRowIds: string[];
  totalUsers: number;
  passes: number;
  quantity: number;
  minerals: Set<string>;
  scrapeStatuses: ConsignerScrapeStatus[];
};

function mergeScrapeStatus(statuses: ConsignerScrapeStatus[]): ConsignerScrapeStatus | undefined {
  if (statuses.length === 0) return undefined;
  if (statuses.some((s) => s === 'pending')) return 'pending';
  if (statuses.some((s) => s === 'partial')) return 'partial';
  if (statuses.some((s) => s === 'complete')) return 'complete';
  return statuses[0];
}

function mineralsForRow(row: EpassDistrictRowDto, operatorFilter: DistrictOperatorFilter): string[] {
  const out: string[] = [];
  if (operatorFilter === 'lessee' || operatorFilter === 'all') {
    if (row.lesseeMineral) out.push(row.lesseeMineral);
  }
  if (operatorFilter === 'dealer' || operatorFilter === 'all') {
    if (row.dealerMineral) out.push(row.dealerMineral);
  }
  return out;
}

function addRowToGroup(acc: GroupAcc, row: EpassDistrictRowDto, operatorFilter: DistrictOperatorFilter): void {
  acc.districtRowIds.push(row.id);
  acc.slNo = Math.min(acc.slNo, row.slNo);

  if (operatorFilter === 'lessee' || operatorFilter === 'all') {
    acc.totalUsers += row.lesseeUsers;
    acc.passes += row.lesseePasses;
    acc.quantity += row.lesseeDispatchedQty;
    if (row.lesseeConsignerScrapeStatus) acc.scrapeStatuses.push(row.lesseeConsignerScrapeStatus);
  }
  if (operatorFilter === 'dealer' || operatorFilter === 'all') {
    acc.totalUsers += row.dealerUsers;
    acc.passes += row.dealerPasses;
    acc.quantity += row.dealerDispatchedQty;
    if (row.dealerConsignerScrapeStatus) acc.scrapeStatuses.push(row.dealerConsignerScrapeStatus);
  }

  for (const m of mineralsForRow(row, operatorFilter)) {
    acc.minerals.add(m);
  }
}

export function formatMineralLabel(minerals: string[]): string {
  if (minerals.length === 0) return '—';
  return [...minerals].sort((a, b) => a.localeCompare(b)).join(' + ');
}

export function mineralLabelForDisplay(
  groupMinerals: string[],
  selectedMinerals: string[] | undefined,
): string {
  const sorted = [...groupMinerals].sort((a, b) => a.localeCompare(b));
  if (!selectedMinerals?.length) return formatMineralLabel(sorted);

  const selectedSet = new Set(selectedMinerals.map((m) => m.toLowerCase()));
  const display = sorted.filter((m) => selectedSet.has(m.toLowerCase()));
  return formatMineralLabel(display);
}

export function aggregateDistrictRowsByDmo(
  rows: EpassDistrictRowDto[],
  operatorFilter: DistrictOperatorFilter,
  selectedMinerals?: string[],
): DistrictFlatRow[] {
  const groups = new Map<string, GroupAcc>();

  for (const row of rows) {
    let acc = groups.get(row.dmoName);
    if (!acc) {
      acc = {
        district: row.dmoName,
        slNo: row.slNo,
        districtRowIds: [],
        totalUsers: 0,
        passes: 0,
        quantity: 0,
        minerals: new Set(),
        scrapeStatuses: [],
      };
      groups.set(row.dmoName, acc);
    }
    addRowToGroup(acc, row, operatorFilter);
  }

  const out: DistrictFlatRow[] = [];
  for (const acc of groups.values()) {
    const minerals = [...acc.minerals].sort((a, b) => a.localeCompare(b));
    out.push({
      district: acc.district,
      slNo: acc.slNo,
      districtRowIds: acc.districtRowIds,
      totalUsers: acc.totalUsers,
      minerals,
      mineralLabel: mineralLabelForDisplay(minerals, selectedMinerals),
      passes: acc.passes,
      quantity: acc.quantity,
      scrapeStatus: mergeScrapeStatus(acc.scrapeStatuses),
    });
  }

  return out.sort((a, b) => a.slNo - b.slNo);
}

export function collectMinerals(rows: EpassDistrictRowDto[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.lesseeMineral) set.add(row.lesseeMineral);
    if (row.dealerMineral) set.add(row.dealerMineral);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Unique DMO names for snapshot district rows (one entry per district label). */
export function collectDistricts(rows: EpassDistrictRowDto[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.dmoName.trim()) set.add(row.dmoName.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function parseDistrictsParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

export function serializeDistricts(districts: string[]): string | null {
  if (districts.length === 0) return null;
  return districts.join(',');
}

export function applyDistrictFilters(
  flat: DistrictFlatRow[],
  filters: DistrictViewFilters,
): DistrictFlatRow[] {
  const selectedDistricts = filters.districts?.filter((d) => d.trim()) ?? [];
  const selected = filters.minerals?.filter((m) => m.trim()) ?? [];

  return flat.filter((row) => {
    if (selectedDistricts.length > 0) {
      const districtSet = new Set(selectedDistricts.map((d) => d.toLowerCase()));
      if (!districtSet.has(row.district.toLowerCase())) return false;
    }
    if (selected.length > 0) {
      const rowSet = new Set(row.minerals.map((m) => m.toLowerCase()));
      const hasMatch = selected.some((m) => rowSet.has(m.toLowerCase()));
      if (!hasMatch) return false;
    }
    if (filters.hideZeroPasses && row.passes <= 0) {
      return false;
    }
    return true;
  });
}

function compareValues(a: string | number, b: string | number, dir: DistrictSortDir): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return dir === 'asc' ? a - b : b - a;
  }
  const sa = String(a);
  const sb = String(b);
  const cmp = sa.localeCompare(sb, undefined, { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

export function sortDistrictRows(
  flat: DistrictFlatRow[],
  sortKey: DistrictSortKey | null,
  sortDir: DistrictSortDir,
): DistrictFlatRow[] {
  if (!sortKey) {
    return [...flat].sort((a, b) => a.slNo - b.slNo);
  }

  return [...flat].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'district':
        cmp = compareValues(a.district, b.district, sortDir);
        break;
      case 'totalUsers':
        cmp = compareValues(a.totalUsers, b.totalUsers, sortDir);
        break;
      case 'mineral':
        cmp = compareValues(a.mineralLabel, b.mineralLabel, sortDir);
        break;
      case 'passes':
        cmp = compareValues(a.passes, b.passes, sortDir);
        break;
      case 'quantity':
        cmp = compareValues(a.quantity, b.quantity, sortDir);
        break;
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp;
    return a.slNo - b.slNo;
  });
}
