'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import {
  getKhananExportJob,
  khananExportDownloadUrl,
  startKhananExport,
  type KhananExportJob,
} from '@/lib/khanan-bulk-upload';

export function KhananExportPanel() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<KhananExportJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const startPoll = useCallback(
    (jobId: string) => {
      stopPoll();
      pollRef.current = setInterval(() => {
        void getKhananExportJob(jobId)
          .then(({ job: j }) => {
            setJob(j);
            if (j.status === 'completed' || j.status === 'failed') {
              stopPoll();
              setBusy(false);
              if (j.status === 'failed') {
                setError(j.error ?? 'Export failed');
              }
            }
          })
          .catch((e) => {
            stopPoll();
            setBusy(false);
            setError(e instanceof Error ? e.message : 'Export status failed');
          });
      }, 2000);
    },
    [stopPoll],
  );

  async function handleExport() {
    setError(null);
    setJob(null);
    setBusy(true);
    try {
      const filters: { dateFrom?: string; dateTo?: string } = {};
      if (dateFrom.trim()) filters.dateFrom = dateFrom.trim();
      if (dateTo.trim()) filters.dateTo = dateTo.trim();
      const { job: created } = await startKhananExport(filters);
      setJob(created);
      startPoll(created.id);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold text-white">Export passes (JSON Lines)</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-text-secondary">From (YYYY-MM-DD)</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
            disabled={busy}
          />
        </label>
        <label className="block text-sm">
          <span className="text-text-secondary">To (YYYY-MM-DD)</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-white"
            disabled={busy}
          />
        </label>
      </div>

      {error ? <DataErrorCard message={error} /> : null}

      {job?.status === 'completed' ? (
        <a
          href={khananExportDownloadUrl(job.id)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download {job.fileName ?? 'export.jsonl.gz'} ({job.rowCount.toLocaleString()} rows)
        </a>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExport()}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {busy && job
            ? `Exporting… ${job.rowCount.toLocaleString()} rows`
            : busy
              ? 'Starting export…'
              : 'Export JSON'}
        </button>
      )}
    </Card>
  );
}
