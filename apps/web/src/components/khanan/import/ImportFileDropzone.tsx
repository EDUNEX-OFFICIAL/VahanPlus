'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { Download, FileJson, Loader2, Upload, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const ACCEPT = '.json,.jsonl,.ndjson,application/json';

const SAMPLE_JSON_URL =
  'https://raw.githubusercontent.com/EDUNEX-OFFICIAL/VahanPlus/main/docs/khanan_sample_5000.json';

interface ImportFileDropzoneProps {
  busy: boolean;
  fileName: string | null;
  rowCount: number;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function ImportFileDropzone({
  busy,
  fileName,
  rowCount,
  onFile,
  onClear,
}: ImportFileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(() => {
    if (!busy) inputRef.current?.click();
  }, [busy]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href={SAMPLE_JSON_URL}
          download="khanan_sample_5000.json"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-indigo-500/35 bg-indigo-500/10 px-3 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          Sample JSON
        </a>
        {fileName ? (
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-600/50 px-3 text-sm text-text-secondary hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {fileName && !busy ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <FileJson className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white">{fileName}</p>
            <p className="text-xs text-text-secondary tabular-nums">{rowCount} rows</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={pickFile}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!busy) setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            if (!busy) handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition',
            dragOver
              ? 'border-indigo-400/60 bg-indigo-500/10'
              : 'border-slate-600/50 bg-slate-900/25 hover:border-indigo-500/40 hover:bg-indigo-500/5',
            busy && 'pointer-events-none opacity-70',
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-indigo-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-indigo-200">Analyzing…</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-600/50 bg-slate-800/60">
                <Upload className="h-6 w-6 text-slate-400" aria-hidden />
              </div>
              <p className="mt-3 text-sm font-medium text-white">Drop file or click to upload</p>
              <p className="mt-1 text-xs text-text-secondary">
                JSON array · JSON Lines · max 10,000 rows (small path)
              </p>
            </>
          )}
        </button>
      )}
    </Card>
  );
}
