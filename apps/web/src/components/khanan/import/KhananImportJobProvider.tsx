'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY, EPASS_SNAPSHOTS_QUERY_KEY } from '@/lib/epass';
import {
  clearStoredImportJob,
  deriveImportPhase,
  expectedRowsFromBatchOptions,
  parseBatchBigInt,
  readStoredImportJob,
  writeStoredImportJob,
  type ImportJobProgress,
  type StoredImportJob,
} from '@/lib/khanan-import-job';
import {
  cancelImportBatch,
  getImportBatch,
  uploadFileInChunks,
  type KhananImportBatch,
} from '@/lib/khanan-bulk-upload';
import {
  dateRangeFromBatchOptions,
  importSummaryFromBatchOptions,
} from '@/lib/khanan-import-options';
import type { ImportSuccessSummary } from '@/lib/epass-import';

const POLL_MS = 2000;

interface StartBackgroundImportOptions {
  replaceExisting?: boolean;
  refreshVehicleStatus?: boolean;
  expectedRows?: number;
  dateFrom?: string;
  dateTo?: string;
  distinctDateCount?: number;
}

interface KhananImportJobContextValue {
  job: ImportJobProgress | null;
  isActive: boolean;
  successMessage: string | null;
  importSuccessSummary: ImportSuccessSummary | null;
  errorMessage: string | null;
  startBackgroundImport: (file: File, options?: StartBackgroundImportOptions) => Promise<void>;
  cancelBackgroundImport: () => Promise<void>;
  clearMessages: () => void;
}

function buildSuccessFromBatch(
  batch: KhananImportBatch,
  stored: Partial<StoredImportJob>,
): { message: string; summary: ImportSuccessSummary } {
  const fromOpts = dateRangeFromBatchOptions(batch.options);
  const importSummary = importSummaryFromBatchOptions(batch.options);
  const dateFrom = batch.dateFrom ?? fromOpts.dateFrom ?? stored.dateFrom;
  const dateTo = batch.dateTo ?? fromOpts.dateTo ?? stored.dateTo;
  const distinctDateCount =
    batch.distinctDateCount ?? fromOpts.distinctDateCount ?? stored.distinctDateCount;
  const snapshotsCreated =
    batch.snapshotsCreated ??
    importSummary?.snapshotsCreated ??
    (distinctDateCount && distinctDateCount > 0 ? distinctDateCount : undefined);

  const summary: ImportSuccessSummary = {
    passesImported: batch.passesImported,
    rowsSkipped: batch.rowsSkipped,
    snapshotsCreated,
    dateFrom,
    dateTo,
    distinctDateCount,
  };

  let message = `Imported ${batch.passesImported.toLocaleString()} pass(es)`;
  if (snapshotsCreated != null && snapshotsCreated > 0) {
    message += ` across ${snapshotsCreated.toLocaleString()} report-date snapshot(s)`;
  }
  if (dateFrom && dateTo) {
    message += ` (${dateFrom} – ${dateTo})`;
  }
  if (batch.rowsSkipped > 0) {
    message += ` · ${batch.rowsSkipped.toLocaleString()} row(s) skipped`;
  }
  message += '.';

  return { message, summary };
}

const KhananImportJobContext = createContext<KhananImportJobContextValue | null>(null);

function batchToJob(
  batch: KhananImportBatch,
  stored: Partial<StoredImportJob>,
  phaseOverride?: ImportJobProgress['phase'],
): ImportJobProgress {
  const totalBytes = parseBatchBigInt(batch.totalBytes) || stored.totalBytes || 0;
  const bytesUploaded = Math.min(
    parseBatchBigInt(batch.bytesReceived),
    totalBytes > 0 ? totalBytes : parseBatchBigInt(batch.bytesReceived),
  );
  const expectedRows =
    batch.expectedRows ?? expectedRowsFromBatchOptions(batch.options) ?? stored.expectedRows;

  const phase = phaseOverride ?? deriveImportPhase(batch, totalBytes, bytesUploaded);

  return {
    batchId: batch.id,
    fileName: batch.fileName || stored.fileName || 'import',
    phase,
    totalBytes,
    bytesUploaded,
    expectedRows,
    rowsProcessed: batch.rowsProcessed,
    rowsSkipped: batch.rowsSkipped,
    passesImported: batch.passesImported,
    error: batch.error ?? undefined,
  };
}

export function KhananImportJobProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [job, setJob] = useState<ImportJobProgress | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importSuccessSummary, setImportSuccessSummary] = useState<ImportSuccessSummary | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadRunningRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rowSamplesRef = useRef<{ t: number; rows: number }[]>([]);

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const finishJob = useCallback(
    async (batch: KhananImportBatch, stored: StoredImportJob) => {
      stopPoll();
      clearStoredImportJob();
      uploadRunningRef.current = false;
      rowSamplesRef.current = [];

      if (batch.status === 'completed') {
        const { message, summary } = buildSuccessFromBatch(batch, stored);
        setSuccessMessage(message);
        setImportSuccessSummary(summary);
        setErrorMessage(null);
        setJob(batchToJob(batch, stored, 'done'));
        await queryClient.invalidateQueries({ queryKey: EPASS_SNAPSHOTS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: EPASS_SNAPSHOT_REPORT_DATES_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: ['epass'] });
      } else {
        const err = batch.error ?? 'Import failed';
        setErrorMessage(err);
        setSuccessMessage(null);
        setImportSuccessSummary(null);
        setJob(batchToJob(batch, stored, 'failed'));
      }
    },
    [queryClient, stopPoll],
  );

  const applyBatchUpdate = useCallback((batch: KhananImportBatch, stored: StoredImportJob) => {
    const now = Date.now();
    rowSamplesRef.current.push({ t: now, rows: batch.rowsProcessed });
    if (rowSamplesRef.current.length > 5) rowSamplesRef.current.shift();

    let etaSeconds: number | undefined;
    const expectedRows =
      batch.expectedRows ?? expectedRowsFromBatchOptions(batch.options) ?? stored.expectedRows;
    if (expectedRows && rowSamplesRef.current.length >= 2) {
      const first = rowSamplesRef.current[0];
      const last = rowSamplesRef.current[rowSamplesRef.current.length - 1];
      const dt = (last.t - first.t) / 1000;
      const dr = last.rows - first.rows;
      if (dt > 0 && dr > 0) {
        const remaining = expectedRows - batch.rowsProcessed;
        etaSeconds = remaining / (dr / dt);
      }
    }

    const next = batchToJob(batch, stored);
    setJob({ ...next, etaSeconds });
  }, []);

  const startPoll = useCallback(
    (batchId: string, stored: StoredImportJob) => {
      stopPoll();
      pollTimerRef.current = setInterval(() => {
        void getImportBatch(batchId)
          .then(({ batch }) => {
            applyBatchUpdate(batch, stored);
            if (batch.status === 'completed' || batch.status === 'failed') {
              void finishJob(batch, stored);
            }
          })
          .catch((e) => {
            stopPoll();
            uploadRunningRef.current = false;
            clearStoredImportJob();
            const msg = e instanceof Error ? e.message : 'Status check failed';
            setErrorMessage(msg);
            setJob((prev) => (prev ? { ...prev, phase: 'failed', error: msg } : null));
          });
      }, POLL_MS);
    },
    [applyBatchUpdate, finishJob, stopPoll],
  );

  const resumeFromStorage = useCallback(async () => {
    const stored = readStoredImportJob();
    if (!stored) return;

    try {
      const { batch } = await getImportBatch(stored.batchId);
      if (batch.status === 'completed' || batch.status === 'failed') {
        await finishJob(batch, stored);
        return;
      }

      const totalBytes = parseBatchBigInt(batch.totalBytes) || stored.totalBytes || 0;
      const bytesReceived = parseBatchBigInt(batch.bytesReceived);
      if (
        batch.status === 'pending' &&
        totalBytes > 0 &&
        bytesReceived < totalBytes &&
        !uploadRunningRef.current
      ) {
        clearStoredImportJob();
        setErrorMessage(
          'Upload was interrupted (browser closed or connection lost). Select the file again to restart.',
        );
        return;
      }

      applyBatchUpdate(batch, stored);
      startPoll(stored.batchId, stored);
    } catch {
      clearStoredImportJob();
    }
  }, [applyBatchUpdate, finishJob, startPoll]);

  useEffect(() => {
    void resumeFromStorage();
    return () => stopPoll();
  }, [resumeFromStorage, stopPoll]);

  const startBackgroundImport = useCallback(
    async (file: File, options: StartBackgroundImportOptions = {}) => {
      if (uploadRunningRef.current) return;
      uploadRunningRef.current = true;
      setSuccessMessage(null);
      setImportSuccessSummary(null);
      setErrorMessage(null);

      const stored: StoredImportJob = {
        batchId: '',
        fileName: file.name,
        totalBytes: file.size,
        expectedRows: options.expectedRows,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
        distinctDateCount: options.distinctDateCount,
      };

      setJob({
        batchId: '',
        fileName: file.name,
        phase: 'upload',
        totalBytes: file.size,
        bytesUploaded: 0,
        expectedRows: options.expectedRows,
        rowsProcessed: 0,
        rowsSkipped: 0,
        passesImported: 0,
      });

      try {
        const { batchId } = await uploadFileInChunks(file, {
          replaceExisting: options.replaceExisting,
          refreshVehicleStatus: options.refreshVehicleStatus,
          expectedRows: options.expectedRows,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
          distinctDateCount: options.distinctDateCount,
          onProgress: (progress) => {
            const { batchId: id, bytesUploaded, totalBytes, phase = 'upload' } = progress;
            if (id) {
              stored.batchId = id;
              writeStoredImportJob({ ...stored, batchId: id });
            }
            setJob((prev) =>
              prev
                ? {
                    ...prev,
                    batchId: id || prev.batchId,
                    bytesUploaded,
                    totalBytes,
                    phase,
                  }
                : null,
            );
          },
        });

        stored.batchId = batchId;
        writeStoredImportJob({ ...stored, batchId });

        const { batch: initial } = await getImportBatch(batchId);
        applyBatchUpdate(initial, stored);
        startPoll(batchId, stored);
      } catch (e) {
        uploadRunningRef.current = false;
        clearStoredImportJob();
        stopPoll();
        const msg = e instanceof Error ? e.message : 'Import failed';
        setErrorMessage(msg);
        setJob((prev) => (prev ? { ...prev, phase: 'failed', error: msg } : null));
      }
    },
    [applyBatchUpdate, startPoll, stopPoll],
  );

  const cancelBackgroundImport = useCallback(async () => {
    const batchId = job?.batchId || readStoredImportJob()?.batchId;
    stopPoll();
    uploadRunningRef.current = false;
    rowSamplesRef.current = [];
    clearStoredImportJob();

    if (batchId) {
      try {
        await cancelImportBatch(batchId);
      } catch {
        // Batch may already be finished or missing — still reset UI.
      }
    }

    setJob(null);
    setErrorMessage(null);
  }, [job?.batchId, stopPoll]);

  const isActive =
    job != null &&
    (job.phase === 'upload' ||
      job.phase === 'assembling' ||
      job.phase === 'queued' ||
      job.phase === 'processing');

  const clearMessages = useCallback(() => {
    setSuccessMessage(null);
    setImportSuccessSummary(null);
    setErrorMessage(null);
  }, []);

  return (
    <KhananImportJobContext.Provider
      value={{
        job,
        isActive,
        successMessage,
        importSuccessSummary,
        errorMessage,
        startBackgroundImport,
        cancelBackgroundImport,
        clearMessages,
      }}
    >
      {children}
    </KhananImportJobContext.Provider>
  );
}

export function useKhananImportJob(): KhananImportJobContextValue {
  const ctx = useContext(KhananImportJobContext);
  if (!ctx) {
    throw new Error('useKhananImportJob must be used within KhananImportJobProvider');
  }
  return ctx;
}
