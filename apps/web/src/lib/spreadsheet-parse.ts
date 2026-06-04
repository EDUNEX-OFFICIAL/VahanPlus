import { parseCsv as parseCsvRaw } from '@/lib/epass-import';

export const IMPORT_MAX_ROWS = 10_000;

function stripBomHeader(headers: string[]): string[] {
  if (headers.length === 0) return headers;
  const copy = [...headers];
  copy[0] = copy[0].replace(/^\uFEFF/, '').trim();
  return copy;
}

function isRowEmpty(row: Record<string, string>): boolean {
  return Object.values(row).every((v) => !String(v ?? '').trim());
}

function filterEmptyRows(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.filter((row) => !isRowEmpty(row));
}

function enforceRowCap(rows: Record<string, string>[]): void {
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new Error(`Too many rows (max ${IMPORT_MAX_ROWS}). Split the file or remove extra rows.`);
  }
}

/** Parse CSV text into headers and row objects (first line = headers). */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = parseCsvRaw(text);
  const headers = stripBomHeader(parsed.headers);
  const rows = filterEmptyRows(parsed.rows);
  enforceRowCap(rows);
  return { headers, rows };
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function cellToString(cell: unknown): string {
  if (cell == null) return '';
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }
  if (typeof cell === 'boolean') {
    return cell ? 'true' : 'false';
  }
  return String(cell).trim();
}

async function parseExcel(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as unknown[][];

  if (grid.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerCells = (grid[0] ?? []).map((cell) => cellToString(cell));
  const cleanHeaders = stripBomHeader(headerCells);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < grid.length; i += 1) {
    const line = grid[i] ?? [];
    /** @type {Record<string, string>} */
    const row: Record<string, string> = {};
    cleanHeaders.forEach((header, idx) => {
      if (!header) return;
      row[header] = cellToString(line[idx]);
    });
    if (!isRowEmpty(row)) rows.push(row);
  }

  enforceRowCap(rows);
  return { headers: cleanHeaders, rows };
}

/**
 * Parse a CSV or Excel upload for Khanan import.
 */
export async function parseImportFile(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ext = extensionOf(file.name);

  if (ext === '.csv') {
    const text = await file.text();
    return parseCsv(text);
  }

  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(file);
  }

  throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls');
}
