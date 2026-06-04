import { apiFetch } from '@/lib/api';

export type ImportDetectedType = 'district_snapshot' | 'vehicle_status' | 'khanan_pass';

export interface ImportAnalyzeResult {
  detectedType: ImportDetectedType | null;
  mapping: Record<string, string>;
  errors: string[];
  warnings: string[];
  rowCount: number;
  distinctDates?: { count: number; sample: string[] };
  distinctVrns?: number;
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
  statsRows?: Record<string, string>[],
) {
  return apiFetch<ImportAnalyzeResult>('/epass/import/analyze', {
    method: 'POST',
    body: JSON.stringify({ headers, sampleRows, totalRowCount, statsRows }),
  });
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

/** Warn when the same VRN appears more than once (last row wins on commit). */
export function buildDuplicateVrnWarnings(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): string[] {
  const col = mapping.vehicleRegNo;
  if (!col) return [];

  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[col]?.trim();
    if (!raw) continue;
    const key = normalizeVrnKey(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const duplicateVrns = [...counts.values()].filter((n) => n > 1).length;
  if (duplicateVrns === 0) return [];

  return [`${duplicateVrns} duplicate VRN(s) in file; last row wins for each.`];
}

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
