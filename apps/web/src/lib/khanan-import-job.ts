export const KHANAN_IMPORT_JOB_STORAGE_KEY = 'vahanplus.khananImportJob';

export type ImportJobPhase = 'upload' | 'processing' | 'done' | 'failed';

export interface ImportJobProgress {
  batchId: string;
  fileName: string;
  phase: ImportJobPhase;
  totalBytes: number;
  bytesUploaded: number;
  expectedRows?: number;
  rowsProcessed: number;
  rowsSkipped: number;
  passesImported: number;
  error?: string;
  etaSeconds?: number;
}

export interface StoredImportJob {
  batchId: string;
  fileName: string;
  totalBytes: number;
  expectedRows?: number;
}

export function readStoredImportJob(): StoredImportJob | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KHANAN_IMPORT_JOB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredImportJob;
    if (!parsed?.batchId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredImportJob(job: StoredImportJob): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KHANAN_IMPORT_JOB_STORAGE_KEY, JSON.stringify(job));
}

export function clearStoredImportJob(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KHANAN_IMPORT_JOB_STORAGE_KEY);
}

export function expectedRowsFromBatchOptions(
  options: Record<string, unknown> | null | undefined,
): number | undefined {
  const n = options?.expectedRows;
  return typeof n === 'number' && n > 0 ? n : undefined;
}
