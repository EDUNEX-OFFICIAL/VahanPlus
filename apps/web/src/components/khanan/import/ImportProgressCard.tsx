'use client';

import { Loader2 } from 'lucide-react';
import type { ImportJobProgress } from '@/lib/khanan-import-job';
import { importFileUploadPct, importRowPct } from '@/lib/khanan-import-job';
import { formatBytes, formatEta } from '@/lib/format-bytes';

interface ImportProgressCardProps {
  job: ImportJobProgress;
  compact?: boolean;
}

function phaseLabel(job: ImportJobProgress): string {
  switch (job.phase) {
    case 'upload':
      return 'Uploading file';
    case 'assembling':
      return 'Finishing upload';
    case 'processing':
      return 'Processing on server';
    case 'done':
      return 'Complete';
    case 'failed':
      return 'Failed';
  }
}

function fileUploadDetail(job: ImportJobProgress): string {
  const pct = importFileUploadPct(job);
  const uploaded =
    job.phase === 'processing' || job.phase === 'done'
      ? job.totalBytes
      : Math.min(job.bytesUploaded, job.totalBytes);
  const total = job.totalBytes;
  if (total <= 0) {
    return job.phase === 'assembling' ? 'Assembling file on server…' : 'Preparing upload…';
  }
  return `${formatBytes(uploaded)} of ${formatBytes(total)} uploaded (${pct}%)`;
}

export function ImportProgressCard({ job, compact = false }: ImportProgressCardProps) {
  const filePct = importFileUploadPct(job);
  const rowPct = importRowPct(job);
  const bytesLeft = Math.max(0, job.totalBytes - Math.min(job.bytesUploaded, job.totalBytes));
  const rowsLeft =
    job.expectedRows != null ? Math.max(0, job.expectedRows - job.rowsProcessed) : null;

  const showFileBar =
    job.phase === 'upload' ||
    job.phase === 'assembling' ||
    job.phase === 'processing' ||
    job.phase === 'done';
  const showRowBar = job.phase === 'processing' && rowPct != null;
  const fileBarPct = job.phase === 'processing' || job.phase === 'done' ? 100 : filePct;

  let processingDetail = '';
  if (job.phase === 'processing') {
    const rowPart =
      job.expectedRows != null
        ? `${job.rowsProcessed.toLocaleString()} of ${job.expectedRows.toLocaleString()} rows (${rowPct}%)`
        : `${job.rowsProcessed.toLocaleString()} rows processed`;
    const passPart =
      job.passesImported > 0 ? ` · ${job.passesImported.toLocaleString()} passes` : '';
    const leftPart = rowsLeft != null ? ` · ${rowsLeft.toLocaleString()} rows left` : '';
    const eta = formatEta(job.etaSeconds);
    processingDetail = `${rowPart}${passPart}${leftPart}${eta ? ` · ${eta}` : ''}`;
  } else if (job.phase === 'assembling') {
    processingDetail = 'All chunks received — assembling file before import starts…';
  } else if (job.phase === 'done') {
    processingDetail = `${job.passesImported.toLocaleString()} passes imported`;
  } else if (job.phase === 'failed') {
    processingDetail = job.error ?? 'Import failed';
  }

  const uploadExtra =
    job.phase === 'upload' && job.totalBytes > 0 && bytesLeft > 0
      ? ` · ${formatBytes(bytesLeft)} left`
      : '';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'} role="status" aria-live="polite">
      {!compact ? <p className="truncate text-sm font-medium text-white">{job.fileName}</p> : null}
      <p
        className={`font-semibold uppercase tracking-wider text-indigo-200/90 ${compact ? 'text-[10px]' : 'text-xs'}`}
      >
        {phaseLabel(job)}
      </p>

      {showFileBar && job.phase !== 'failed' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
            <span>File size</span>
            <span className="tabular-nums text-indigo-200/90">
              {fileUploadDetail(job)}
              {uploadExtra}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${fileBarPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {showRowBar ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
            <span>Rows</span>
            <span className="tabular-nums text-indigo-200/90">{processingDetail}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500/80 transition-all duration-300"
              style={{ width: `${rowPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {!showRowBar &&
      (job.phase === 'assembling' || job.phase === 'done' || job.phase === 'failed') ? (
        <p
          className={`flex items-start gap-2 tabular-nums ${compact ? 'text-xs text-indigo-200/90' : 'text-sm text-indigo-200'}`}
        >
          {job.phase !== 'failed' && job.phase !== 'done' ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : null}
          <span>{processingDetail}</span>
        </p>
      ) : null}

      {job.phase === 'upload' ? (
        <p
          className={`flex items-start gap-2 ${compact ? 'text-xs text-indigo-200/80' : 'text-xs text-text-secondary'}`}
        >
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          <span>Upload runs in chunks — safe to switch pages after upload reaches 100%.</span>
        </p>
      ) : null}
    </div>
  );
}
