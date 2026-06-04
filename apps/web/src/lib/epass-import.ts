import { apiFetch } from '@/lib/api';
import { parseReportDateFlexible } from '@/lib/epass-report-date';

export type ImportDetectedType = 'district_snapshot' | 'vehicle_status' | 'khanan_pass';

export interface ImportAnalyzeResult {
  detectedType: ImportDetectedType | null;
  mapping: Record<string, string>;
  errors: string[];
  warnings: string[];
  rowCount: number;
  distinctDates?: { count: number; sample: string[] };
  dateFrom?: string;
  dateTo?: string;
  distinctVrns?: number;
}

export interface ImportSuccessSummary {
  passesImported: number;
  rowsSkipped: number;
  snapshotsCreated?: number;
  dateFrom?: string;
  dateTo?: string;
  distinctDateCount?: number;
}

export interface ImportCommitResult {
  snapshotId?: string;
  rowsImported?: number;
  reportDate?: string;
  upserted?: number;
  skipped?: number;
  batchId?: string;
  snapshotsCreated?: number;
  passesImported?: number;
  vrnsQueued?: number;
  vrnsSkippedExisting?: number;
  warnings?: string[];
}

export function analyzeImport(
  headers: string[],
  sampleRows: Record<string, string>[],
  totalRowCount?: number,
) {
  return apiFetch<ImportAnalyzeResult>('/epass/import/analyze', {
    method: 'POST',
    body: JSON.stringify({ headers, sampleRows, totalRowCount }),
  });
}

function parseImportDateToIso(value: string): string | null {
  const d = parseReportDateFlexible(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Full-file stats for khanan_pass after analyze returns column mapping (keeps analyze payload small). */
export function buildKhananPassAnalyzeStatsClient(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): Pick<
  ImportAnalyzeResult,
  'distinctDates' | 'dateFrom' | 'dateTo' | 'distinctVrns' | 'warnings'
> {
  const dateCol = mapping.date;
  const vrnCol = mapping.vehicleRegNo;
  const dates = new Set<string>();
  const vrns = new Set<string>();
  let unparseableDates = 0;
  let blankVrn = 0;

  for (const row of rows) {
    const rawDate = dateCol ? String(row[dateCol] ?? '').trim() : '';
    if (rawDate) {
      const iso = parseImportDateToIso(rawDate);
      if (iso) dates.add(iso);
      else unparseableDates += 1;
    }
    const rawVrn = vrnCol ? String(row[vrnCol] ?? '').trim() : '';
    const key = normalizeVrnKey(rawVrn);
    if (!key) blankVrn += 1;
    else vrns.add(key);
  }

  const warnings: string[] = [];
  if (unparseableDates > 0) {
    warnings.push(`${unparseableDates} row(s) have unparseable date values.`);
  }
  if (blankVrn > 0) {
    warnings.push(`${blankVrn} row(s) have blank VRN.`);
  }

  const dateList = [...dates].sort();
  return {
    distinctDates: { count: dates.size, sample: dateList.slice(0, 5) },
    dateFrom: dateList[0],
    dateTo: dateList.length > 0 ? dateList[dateList.length - 1] : undefined,
    distinctVrns: vrns.size,
    warnings,
  };
}

export function commitImport(body: {
  type: ImportDetectedType;
  mapping: Record<string, string>;
  rows: Record<string, string>[];
  reportDate?: string;
  replaceExisting?: boolean;
  refreshVehicleStatus?: boolean;
}) {
  return apiFetch<ImportCommitResult>('/epass/import/commit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Normalize VRN for duplicate detection (matches server import). */
function normalizeVrnKey(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

/** Plates (VRN keys) that appear on 2+ rows — normal for multiple challans/dates, not duplicate challans. */
export function countVrnsOnMultipleRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): { platesOnMultipleRows: number; uniqueVrns: number } | null {
  const col = mapping.vehicleRegNo;
  if (!col) return null;

  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[col]?.trim();
    if (!raw) continue;
    const key = normalizeVrnKey(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const platesOnMultipleRows = [...counts.values()].filter((n) => n > 1).length;
  if (platesOnMultipleRows === 0) return null;

  return { platesOnMultipleRows, uniqueVrns: counts.size };
}

/** Info when the same VRN appears on multiple rows (all rows still import as separate passes). */
export function buildDuplicateVrnWarnings(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): string[] {
  const stats = countVrnsOnMultipleRows(rows, mapping);
  if (!stats) return [];

  return [
    `${stats.platesOnMultipleRows} plate(s) appear on more than one row (${stats.uniqueVrns} unique VRNs in ${rows.length} rows). Same vehicle with multiple challans or dates is normal — all rows import; this is not duplicate challans.`,
  ];
}

/** URL to browse consigners across an imported report-date range. */
export function consignerBrowseDateRangeUrl(dateFrom: string, dateTo: string): string {
  const q = new URLSearchParams({
    dateMode: 'range',
    dateFrom,
    dateTo,
  });
  return `/khanan/consigner?${q.toString()}`;
}

export const MULTI_DATE_IMPORT_HINT_THRESHOLD = 10;

/** Parse CSV text into headers and row objects (first line = headers). */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    /** @type {Record<string, string>} */
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    return row;
  });

  return { headers, rows };
}
