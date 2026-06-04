'use client';

import { Loader2 } from 'lucide-react';
import type { ImportJobProgress } from '@/lib/khanan-import-job';
import { formatBytes, formatEta } from '@/lib/format-bytes';

interface ImportProgressCardProps {
  job: ImportJobProgress;
  compact?: boolean;
}

function progressPct(job: ImportJobProgress): number {
  if (job.phase === 'upload' && job.totalBytes > 0) {
    return Math.min(100, Math.round((job.bytesUploaded / job.totalBytes) * 100));
  }
  if (job.phase === 'processing' && job.expectedRows && job.expectedRows > 0) {
    return Math.min(100, Math.round((job.rowsProcessed / job.expectedRows) * 100));
  }
  if (job.phase === 'done') return 100;
  return 8;
}

export function ImportProgressCard({ job, compact = false }: ImportProgressCardProps) {
  const pct = progressPct(job);
  const bytesLeft = Math.max(0, job.totalBytes - job.bytesUploaded);
  const rowsLeft =
    job.expectedRows != null ? Math.max(0, job.expectedRows - job.rowsProcessed) : null;

  let detail = '';
  if (job.phase === 'upload') {
    detail = `${formatBytes(job.bytesUploaded)} / ${formatBytes(job.totalBytes)} uploaded · ${pct}% · ${formatBytes(bytesLeft)} left`;
  } else if (job.phase === 'processing') {
    const rowPart =
      job.expectedRows != null
        ? `${job.rowsProcessed.toLocaleString()} / ${job.expectedRows.toLocaleString()} rows · ${pct}%`
        : `${job.rowsProcessed.toLocaleString()} rows`;
    const passPart =
      job.passesImported > 0 ? ` · ${job.passesImported.toLocaleString()} passes` : '';
    const leftPart = rowsLeft != null ? ` · ${rowsLeft.toLocaleString()} left` : '';
    const eta = formatEta(job.etaSeconds);
    detail = `${rowPart}${passPart}${leftPart}${eta ? ` · ${eta}` : ''}`;
  } else if (job.phase === 'done') {
    detail = `Complete · ${job.passesImported.toLocaleString()} passes imported`;
  } else if (job.phase === 'failed') {
    detail = job.error ?? 'Import failed';
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'} role="status" aria-live="polite">
      {!compact ? <p className="truncate text-sm font-medium text-white">{job.fileName}</p> : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={`flex items-start gap-2 tabular-nums ${compact ? 'text-xs text-indigo-200/90' : 'text-sm text-indigo-200'}`}
      >
        {job.phase !== 'failed' && job.phase !== 'done' ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : null}
        <span>{detail}</span>
      </p>
    </div>
  );
}
