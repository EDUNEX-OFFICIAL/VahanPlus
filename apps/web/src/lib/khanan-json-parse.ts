import { IMPORT_MAX_ROWS } from '@/lib/spreadsheet-parse';

const SMALL_JSON_MAX_BYTES = 50 * 1024 * 1024;

export const BULK_UPLOAD_THRESHOLD_BYTES = 8 * 1024 * 1024;

export function isKhananJsonFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.json') || lower.endsWith('.jsonl') || lower.endsWith('.ndjson');
}

export function isNdjsonFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.jsonl') || lower.endsWith('.ndjson');
}

function recordToRow(record: Record<string, unknown>): Record<string, string> {
  const row: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v == null || typeof v === 'object') continue;
    row[k] = String(v).trim();
  }
  return row;
}

/** Parse a small JSON array file in-browser (Mongo export shape). */
export async function parseKhananJsonArrayFile(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  if (file.size > SMALL_JSON_MAX_BYTES) {
    throw new Error('JSON array is too large for browser import. Use bulk upload (JSON Lines).');
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSON file must be an array of pass objects');
  }

  if (parsed.length > IMPORT_MAX_ROWS) {
    throw new Error(`Too many rows (max ${IMPORT_MAX_ROWS}). Use bulk upload for larger files.`);
  }

  const rows = parsed
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map(recordToRow)
    .filter((row) => Object.values(row).some((v) => v.length > 0));

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = [...headerSet];

  return { headers, rows };
}

export function shouldUseBulkUpload(file: File): boolean {
  return isNdjsonFile(file.name) || file.size >= BULK_UPLOAD_THRESHOLD_BYTES;
}
