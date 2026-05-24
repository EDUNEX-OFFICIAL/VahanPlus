import type {
  ConsignerDistrictGroup,
  ConsignerSortDir,
  ConsignerSortKey,
  ConsignerViewFilters,
  EpassConsignerListItemDto,
  EpassConsignerRowDto,
} from '@/lib/epass-types';

type ConsignerRow = EpassConsignerListItemDto | EpassConsignerRowDto;

function consignerOperatorType(row: ConsignerRow) {
  return row.operatorType ?? row.role ?? 'lessee';
}

function compareValues(a: string | number, b: string | number, dir: ConsignerSortDir): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return dir === 'asc' ? a - b : b - a;
  }
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const cmp = sa.localeCompare(sb, undefined, { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

function hasDmo(row: ConsignerRow): row is EpassConsignerListItemDto {
  return 'dmoName' in row;
}

/** Same consigner scraped from multiple district rows for one DMO → one display row. */
export function consignerDedupeKey(row: ConsignerRow): string {
  const dmo = hasDmo(row) ? row.dmoName : '';
  return [
    dmo.toLowerCase(),
    consignerOperatorType(row),
    row.consignerName.toLowerCase(),
    (row.mineral ?? '').toLowerCase(),
    String(row.slNo),
  ].join('|');
}

function preferConsignerRow<T extends ConsignerRow>(a: T, b: T): T {
  const aLines = a.challanLineCount ?? 0;
  const bLines = b.challanLineCount ?? 0;
  if (bLines !== aLines) return bLines > aLines ? b : a;
  if (b.challanCount !== a.challanCount) return b.challanCount > a.challanCount ? b : a;
  return a;
}

export function dedupeConsignerRows<T extends ConsignerRow>(rows: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = consignerDedupeKey(row);
    const prev = byKey.get(key);
    byKey.set(key, prev ? preferConsignerRow(prev, row) : row);
  }
  return [...byKey.values()];
}

export function sortConsignerRows<T extends ConsignerRow>(
  rows: T[],
  sortKey: ConsignerSortKey | null,
  sortDir: ConsignerSortDir,
): T[] {
  if (!sortKey) {
    return [...rows].sort((a, b) => {
      const da = hasDmo(a) ? a.districtSlNo : 0;
      const db = hasDmo(b) ? b.districtSlNo : 0;
      if (da !== db) return da - db;
      return a.slNo - b.slNo;
    });
  }

  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'district':
        cmp = compareValues(
          hasDmo(a) ? a.dmoName : '',
          hasDmo(b) ? b.dmoName : '',
          sortDir,
        );
        if (cmp === 0) {
          cmp = compareValues(consignerOperatorType(a), consignerOperatorType(b), sortDir);
        }
        break;
      case 'consigner':
        cmp = compareValues(a.consignerName, b.consignerName, sortDir);
        break;
      case 'mineral':
        cmp = compareValues(a.mineral ?? '', b.mineral ?? '', sortDir);
        break;
      case 'role':
      case 'operator':
        cmp = compareValues(consignerOperatorType(a), consignerOperatorType(b), sortDir);
        if (cmp === 0) {
          cmp = compareValues(hasDmo(a) ? a.dmoName : '', hasDmo(b) ? b.dmoName : '', sortDir);
        }
        break;
      case 'challans':
        cmp = compareValues(a.challanCount, b.challanCount, sortDir);
        break;
      case 'slNo':
        cmp = compareValues(a.slNo, b.slNo, sortDir);
        break;
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp;
    const da = hasDmo(a) ? a.districtSlNo : 0;
    const db = hasDmo(b) ? b.districtSlNo : 0;
    if (da !== db) return da - db;
    return a.slNo - b.slNo;
  });
}

export function applyConsignerFilters<T extends ConsignerRow>(
  rows: T[],
  filters: ConsignerViewFilters,
): T[] {
  const selectedDistricts = filters.districts?.filter((d) => d.trim()) ?? [];
  const selected = filters.minerals?.filter((m) => m.trim()) ?? [];
  const consignerSearch = filters.consignerSearch?.trim().toLowerCase();

  return rows.filter((row) => {
    if (selectedDistricts.length > 0 && hasDmo(row)) {
      const districtSet = new Set(selectedDistricts.map((d) => d.toLowerCase()));
      if (!districtSet.has(row.dmoName.toLowerCase())) return false;
    }
    if (consignerSearch && !row.consignerName.toLowerCase().includes(consignerSearch)) {
      return false;
    }
    if (selected.length > 0) {
      const mineral = (row.mineral ?? '').toLowerCase();
      const hasMatch = selected.some((m) => mineral === m.toLowerCase());
      if (!hasMatch) return false;
    }
    if (filters.hideZeroChallans && row.challanCount <= 0) {
      return false;
    }
    return true;
  });
}

export function groupConsignerRowsByDistrict(
  rows: EpassConsignerListItemDto[],
  sortKey: ConsignerSortKey | null,
  sortDir: ConsignerSortDir,
): ConsignerDistrictGroup[] {
  const sorted = sortConsignerRows(dedupeConsignerRows(rows), sortKey ?? 'district', sortDir);
  const groups: ConsignerDistrictGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const row of sorted) {
    const op = consignerOperatorType(row);
    const key = `${row.dmoName}:${op}`;
    const existing = indexByKey.get(key);
    if (existing != null) {
      groups[existing].rows.push(row);
      continue;
    }
    indexByKey.set(key, groups.length);
    groups.push({
      key,
      dmoName: row.dmoName,
      operatorType: op,
      districtSlNo: row.districtSlNo,
      rows: [row],
    });
  }

  if (sortKey && sortKey !== 'district') {
    return groups;
  }

  return [...groups].sort((a, b) => {
    const cmp = compareValues(a.dmoName, b.dmoName, sortDir);
    if (cmp !== 0) return cmp;
    const opCmp = compareValues(a.operatorType, b.operatorType, sortDir);
    if (opCmp !== 0) return opCmp;
    return a.districtSlNo - b.districtSlNo;
  });
}

export function serializeConsignerMinerals(minerals: string[]): string | undefined {
  if (minerals.length === 0) return undefined;
  return minerals.join(',');
}

export function parseConsignerMineralsParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}
