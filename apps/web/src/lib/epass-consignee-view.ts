import { isReportDateInRange, normalizeReportDate } from '@/lib/epass-report-date';
import type {
  ConsigneeSortDir,
  ConsigneeSortKey,
  ConsigneeViewFilters,
  EpassChallanRowDto,
} from '@/lib/epass-types';

function compareValues(a: string | number, b: string | number, dir: ConsigneeSortDir): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return dir === 'asc' ? a - b : b - a;
  }
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const cmp = sa.localeCompare(sb, undefined, { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

export function applyConsigneeFilters(
  rows: EpassChallanRowDto[],
  filters: ConsigneeViewFilters,
): EpassChallanRowDto[] {
  const consigneeSearch = filters.consigneeSearch?.trim().toLowerCase();
  const from = filters.dateFrom || null;
  const to = filters.dateTo || null;

  return rows.filter((row) => {
    if (from || to) {
      if (!isReportDateInRange(row.reportDate, from, to)) return false;
    }
    const selectedMinerals = filters.minerals?.filter((m) => m.trim()) ?? [];
    if (selectedMinerals.length > 0) {
      const mineral = (row.mineral ?? '').toLowerCase();
      const hasMatch = selectedMinerals.some((m) => mineral === m.toLowerCase());
      if (!hasMatch) return false;
    }
    if (consigneeSearch && !row.consigneeName.toLowerCase().includes(consigneeSearch)) {
      return false;
    }
    if (filters.hideZeroPasses && row.challanCount <= 0) {
      return false;
    }
    return true;
  });
}

export function sortConsigneeRows(
  rows: EpassChallanRowDto[],
  sortKey: ConsigneeSortKey | null,
  sortDir: ConsigneeSortDir,
): EpassChallanRowDto[] {
  if (!sortKey) {
    return [...rows].sort((a, b) => {
      const dateCmp = compareValues(a.reportDate, b.reportDate, 'asc');
      if (dateCmp !== 0) return dateCmp;
      return a.slNo - b.slNo;
    });
  }

  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'date':
        cmp = compareValues(a.reportDate, b.reportDate, sortDir);
        break;
      case 'consignee':
        cmp = compareValues(a.consigneeName, b.consigneeName, sortDir);
        break;
      case 'mineral':
        cmp = compareValues(a.mineral ?? '', b.mineral ?? '', sortDir);
        break;
      case 'passes':
        cmp = compareValues(a.challanCount, b.challanCount, sortDir);
        break;
      case 'qty':
        cmp = compareValues(a.dispatchedQty, b.dispatchedQty, sortDir);
        break;
      case 'slNo':
        cmp = compareValues(a.slNo, b.slNo, sortDir);
        break;
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp;
    const dateCmp = compareValues(a.reportDate, b.reportDate, 'asc');
    if (dateCmp !== 0) return dateCmp;
    return a.slNo - b.slNo;
  });
}

/** Display portal report date in table (keep portal format). */
export function formatReportDateCell(reportDate: string): string {
  return normalizeReportDate(reportDate);
}

export function normalizeMineralLabel(value: string | null | undefined): string {
  const source = (value ?? '').trim();
  if (!source) return '—';
  const lower = source.toLowerCase();
  if (lower.includes('yellow')) return 'Sand Yellow';
  if (lower.includes('white')) return 'Sand White';
  return (
    source
      .replace(/\bno\s*size\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || '—'
  );
}
