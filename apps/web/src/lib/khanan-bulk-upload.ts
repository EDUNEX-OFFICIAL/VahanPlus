import { API_URL } from '@/lib/api';

export const DEFAULT_CHUNK_BYTES = 16 * 1024 * 1024;

export interface KhananImportBatch {
  id: string;
  status: string;
  fileName: string;
  format: string;
  totalBytes: string | null;
  bytesReceived: string;
  chunkSize: number;
  expectedChunks: number | null;
  rowsProcessed: number;
  rowsSkipped: number;
  passesImported: number;
  expectedRows?: number;
  dateFrom?: string;
  dateTo?: string;
  distinctDateCount?: number;
  snapshotsCreated?: number;
  error: string | null;
  options?: Record<string, unknown> | null;
  scrapeJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChunkUploadProgress {
  batchId: string;
  pct: number;
  bytesUploaded: number;
  totalBytes: number;
  phase?: 'upload' | 'assembling';
}

export interface KhananExportJob {
  id: string;
  status: string;
  fileName: string | null;
  filters?: Record<string, unknown> | null;
  rowCount: number;
  error: string | null;
  scrapeJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function createImportBatch(input: {
  fileName: string;
  totalBytes: number;
  expectedChunks: number;
  format?: string;
  options?: Record<string, unknown>;
}) {
  const res = await fetch(`${API_URL}/epass/import/batches`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<{
    batchId: string;
    chunkSizeBytes: number;
    batch: KhananImportBatch;
  }>(res);
}

export async function uploadImportChunk(
  batchId: string,
  index: number,
  chunk: Blob,
  signal?: AbortSignal,
) {
  const res = await fetch(`${API_URL}/epass/import/batches/${batchId}/chunks/${index}`, {
    method: 'PUT',
    credentials: 'include',
    body: chunk,
    signal,
  });
  return parseJsonResponse<{ ok: boolean; bytesReceived: string }>(res);
}

export async function completeImportBatch(batchId: string, expectedChunks: number) {
  const res = await fetch(`${API_URL}/epass/import/batches/${batchId}/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedChunks }),
  });
  return parseJsonResponse<{ batch: KhananImportBatch; scrapeJobId: string }>(res);
}

export async function getImportBatch(batchId: string) {
  const res = await fetch(`${API_URL}/epass/import/batches/${batchId}`, {
    credentials: 'include',
  });
  return parseJsonResponse<{ batch: KhananImportBatch }>(res);
}

export async function cancelImportBatch(batchId: string) {
  const res = await fetch(`${API_URL}/epass/import/batches/${batchId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  });
  return parseJsonResponse<{ batch: KhananImportBatch }>(res);
}

export async function uploadFileInChunks(
  file: File,
  options: {
    replaceExisting?: boolean;
    refreshVehicleStatus?: boolean;
    expectedRows?: number;
    dateFrom?: string;
    dateTo?: string;
    distinctDateCount?: number;
    chunkSize?: number;
    onProgress?: (progress: ChunkUploadProgress) => void;
    signal?: AbortSignal;
  },
): Promise<{ batchId: string }> {
  if (file.size <= 0) {
    throw new Error('File is empty — choose a JSON or JSON Lines file with data.');
  }

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_BYTES;
  const expectedChunks = Math.ceil(file.size / chunkSize) || 1;
  const format = file.name.toLowerCase().endsWith('.json') ? 'json_array' : 'ndjson';

  options.onProgress?.({
    batchId: '',
    pct: 0,
    bytesUploaded: 0,
    totalBytes: file.size,
    phase: 'upload',
  });

  const { batchId } = await createImportBatch({
    fileName: file.name,
    totalBytes: file.size,
    expectedChunks,
    format,
    options: {
      replaceExisting: Boolean(options.replaceExisting),
      refreshVehicleStatus: Boolean(options.refreshVehicleStatus),
      ...(options.expectedRows != null ? { expectedRows: options.expectedRows } : {}),
      ...(options.dateFrom ? { dateFrom: options.dateFrom } : {}),
      ...(options.dateTo ? { dateTo: options.dateTo } : {}),
      ...(options.distinctDateCount != null
        ? { distinctDateCount: options.distinctDateCount }
        : {}),
    },
  });

  for (let i = 0; i < expectedChunks; i += 1) {
    if (options.signal?.aborted) throw new Error('Upload cancelled');
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    await uploadImportChunk(batchId, i, chunk, options.signal);
    const bytesUploaded = end;
    options.onProgress?.({
      batchId,
      pct: Math.round((bytesUploaded / file.size) * 100),
      bytesUploaded,
      totalBytes: file.size,
      phase: 'upload',
    });
  }

  options.onProgress?.({
    batchId,
    pct: 100,
    bytesUploaded: file.size,
    totalBytes: file.size,
    phase: 'assembling',
  });

  await completeImportBatch(batchId, expectedChunks);
  return { batchId };
}

export async function startKhananExport(filters: { dateFrom?: string; dateTo?: string }) {
  const res = await fetch(`${API_URL}/epass/import/export/khanan-passes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters }),
  });
  return parseJsonResponse<{ job: KhananExportJob; scrapeJobId: string }>(res);
}

export async function getKhananExportJob(jobId: string) {
  const res = await fetch(`${API_URL}/epass/import/export/jobs/${jobId}`, {
    credentials: 'include',
  });
  return parseJsonResponse<{ job: KhananExportJob }>(res);
}

export function khananExportDownloadUrl(jobId: string): string {
  return `${API_URL}/epass/import/export/jobs/${jobId}/download`;
}

/** Poll batch until completed or failed. */
export async function pollImportBatchUntilDone(
  batchId: string,
  onUpdate?: (batch: KhananImportBatch) => void,
  intervalMs = 2000,
): Promise<KhananImportBatch> {
  for (;;) {
    const { batch } = await getImportBatch(batchId);
    onUpdate?.(batch);
    if (batch.status === 'completed' || batch.status === 'failed') {
      return batch;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
