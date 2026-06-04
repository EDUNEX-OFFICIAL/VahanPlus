'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  getImportBatch,
  uploadFileInChunks,
  type KhananImportBatch,
} from '@/lib/khanan-bulk-upload';

interface BulkJsonUploaderProps {
  file: File | null;
  busy: boolean;
  replaceExisting: boolean;
  refreshVehicleStatus: boolean;
  onBusyChange: (busy: boolean) => void;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
}

export function BulkJsonUploader({
  file,
  busy,
  replaceExisting,
  refreshVehicleStatus,
  onBusyChange,
  onMessage,
  onError,
}: BulkJsonUploaderProps) {
  const startedRef = useRef<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [batch, setBatch] = useState<KhananImportBatch | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const startPoll = useCallback(
    (batchId: string) => {
      stopPoll();
      pollRef.current = setInterval(() => {
        void getImportBatch(batchId)
          .then(({ batch: b }) => {
            setBatch(b);
            if (b.status === 'completed') {
              stopPoll();
              onBusyChange(false);
              onMessage(
                `Bulk import complete · ${b.passesImported} pass(es) · ${b.rowsSkipped} skipped`,
              );
            } else if (b.status === 'failed') {
              stopPoll();
              onBusyChange(false);
              onError(b.error ?? 'Import failed');
            }
          })
          .catch((e) => {
            stopPoll();
            onBusyChange(false);
            onError(e instanceof Error ? e.message : 'Status check failed');
          });
      }, 2000);
    },
    [onBusyChange, onError, onMessage, stopPoll],
  );

  const runUpload = useCallback(
    async (uploadFile: File) => {
      onError(null);
      onMessage(null);
      setBatch(null);
      setUploadPct(0);
      onBusyChange(true);

      try {
        const { batchId } = await uploadFileInChunks(uploadFile, {
          replaceExisting,
          refreshVehicleStatus,
          onProgress: setUploadPct,
        });
        setUploadPct(null);
        onMessage('Upload complete · processing on server…');
        const { batch: initial } = await getImportBatch(batchId);
        setBatch(initial);
        startPoll(batchId);
      } catch (e) {
        onBusyChange(false);
        setUploadPct(null);
        onError(e instanceof Error ? e.message : 'Bulk upload failed');
      }
    },
    [onBusyChange, onError, onMessage, refreshVehicleStatus, replaceExisting, startPoll],
  );

  useEffect(() => {
    if (!file) {
      startedRef.current = null;
      return;
    }
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (startedRef.current === key) return;
    startedRef.current = key;
    void runUpload(file);
  }, [file, runUpload]);

  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-white">Large file (JSON Lines or big JSON array)</p>
      {file ? <p className="truncate text-xs text-text-secondary">{file.name}</p> : null}
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 transition',
          busy
            ? 'pointer-events-none border-slate-600/50 opacity-70'
            : 'border-slate-600/50 hover:border-indigo-500/40 hover:bg-indigo-500/5',
        )}
      >
        <input
          type="file"
          accept=".json,.jsonl,.ndjson,application/json"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void runUpload(f);
            e.target.value = '';
          }}
        />
        {busy && uploadPct != null ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-indigo-300" aria-hidden />
            <p className="mt-2 text-sm text-indigo-200">Uploading… {uploadPct}%</p>
          </>
        ) : busy && batch ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-indigo-300" aria-hidden />
            <p className="mt-2 text-sm text-indigo-200 tabular-nums">
              Processing… {batch.rowsProcessed.toLocaleString()} rows
              {batch.passesImported > 0 ? ` · ${batch.passesImported.toLocaleString()} passes` : ''}
            </p>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-slate-400" aria-hidden />
            <p className="mt-2 text-xs text-text-secondary">Chunked upload · resumes per chunk</p>
          </>
        )}
      </label>
    </Card>
  );
}
