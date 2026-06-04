export const KHANAN_IMPORT_JOB_STORAGE_KEY = 'vahanplus.khananImportJob';

export type ImportJobPhase = 'upload' | 'assembling' | 'processing' | 'done' | 'failed';

export interface ImportJobProgress {
  batchId: string;
  fileName: string;
  phase: ImportJobPhase;
  totalBytes: number;
  /** Bytes received by the server (file upload), capped at totalBytes. */
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
  dateFrom?: string;
  dateTo?: string;
  distinctDateCount?: number;
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

export function parseBatchBigInt(value: string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** File upload % (0–100) from bytes uploaded vs declared file size. */
export function importFileUploadPct(job: ImportJobProgress): number {
  if (job.totalBytes <= 0) {
    return job.phase === 'done' ? 100 : 0;
  }
  const uploaded =
    job.phase === 'processing' || job.phase === 'done'
      ? job.totalBytes
      : Math.min(job.bytesUploaded, job.totalBytes);
  return Math.min(100, Math.round((uploaded / job.totalBytes) * 100));
}

/** Row processing % when expected row count is known. */
export function importRowPct(job: ImportJobProgress): number | null {
  if (!job.expectedRows || job.expectedRows <= 0) return null;
  return Math.min(100, Math.round((job.rowsProcessed / job.expectedRows) * 100));
}

/** Primary % for compact banners (file upload first, then rows). */
export function importOverallPct(job: ImportJobProgress): number {
  if (job.phase === 'done') return 100;
  if (job.phase === 'failed') return 0;
  if (job.phase === 'upload' || job.phase === 'assembling') return importFileUploadPct(job);
  const rowPct = importRowPct(job);
  if (rowPct != null) return rowPct;
  return importFileUploadPct(job) || 8;
}

export function deriveImportPhase(
  batch: { status: string },
  totalBytes: number,
  bytesReceived: number,
): ImportJobPhase {
  if (batch.status === 'completed') return 'done';
  if (batch.status === 'failed') return 'failed';
  if (batch.status === 'active') return 'processing';
  if (totalBytes > 0 && bytesReceived < totalBytes) return 'upload';
  return 'processing';
}
