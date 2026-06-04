'use client';

import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import type { ImportAnalyzeResult } from '@/lib/epass-import';
import { importTypeChipTone, importTypeLabel } from '@/lib/import-display';

export interface ImportProgressState {
  phase: 'upload' | 'processing';
  uploadPct?: number;
  rowsProcessed?: number;
  passesImported?: number;
}

interface ImportReviewPanelProps {
  analysis: ImportAnalyzeResult;
  reportDate: string;
  replaceExisting: boolean;
  refreshVehicleStatus: boolean;
  busy: boolean;
  importProgress?: ImportProgressState | null;
  useBackgroundImport?: boolean;
  onReportDateChange: (value: string) => void;
  onReplaceExistingChange: (checked: boolean) => void;
  onRefreshVehicleStatusChange: (checked: boolean) => void;
  onImport: () => void;
}

export function ImportReviewPanel({
  analysis,
  reportDate,
  replaceExisting,
  refreshVehicleStatus,
  busy,
  importProgress,
  useBackgroundImport,
  onReportDateChange,
  onReplaceExistingChange,
  onRefreshVehicleStatusChange,
  onImport,
}: ImportReviewPanelProps) {
  const canImport = Boolean(analysis.detectedType) && analysis.errors.length === 0 && !busy;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Detected format
        </span>
        <Chip tone={importTypeChipTone(analysis.detectedType)}>
          {importTypeLabel(analysis.detectedType)}
        </Chip>
      </div>

      <p className="text-sm text-text-secondary tabular-nums">{analysis.rowCount} data row(s)</p>

      {analysis.detectedType === 'khanan_pass' ? (
        <>
          <p className="text-xs text-text-secondary tabular-nums">
            {analysis.distinctDates?.count ?? 0} report date(s)
            {analysis.distinctDates?.sample?.length
              ? ` · ${analysis.distinctDates.sample.join(', ')}`
              : ''}
            · {analysis.distinctVrns ?? 0} distinct VRN(s)
          </p>
          {useBackgroundImport ? (
            <p className="text-xs text-indigo-200/90">
              {analysis.rowCount.toLocaleString()} rows — Import runs on the server with progress
              (avoids timeout).
            </p>
          ) : null}
        </>
      ) : null}

      {analysis.errors.length > 0 ? (
        <Alert type="error">
          <ul className="list-inside list-disc space-y-1">
            {analysis.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {analysis.warnings.length > 0 ? (
        <Alert type="warning">
          <ul className="list-inside list-disc space-y-1">
            {analysis.warnings.map((warn) => (
              <li key={warn}>{warn}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {Object.keys(analysis.mapping).length > 0 ? (
        <div className="max-h-64 overflow-auto rounded-xl border border-border-default/60">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-primary text-xs uppercase text-text-secondary">
              <tr>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">File column</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analysis.mapping).map(([field, col]) => (
                <tr key={field} className="border-t border-border-default/50">
                  <td className="px-3 py-2 font-medium text-white">{field}</td>
                  <td className="px-3 py-2 text-text-secondary">{col}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {analysis.detectedType === 'district_snapshot' ? (
        <Input
          label="Report date"
          type="date"
          value={reportDate}
          disabled={busy}
          onChange={(e) => onReportDateChange(e.target.value)}
        />
      ) : null}

      {analysis.detectedType === 'khanan_pass' ? (
        <div className="space-y-2 text-sm text-text-secondary">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={replaceExisting}
              disabled={busy}
              onChange={(e) => onReplaceExistingChange(e.target.checked)}
            />
            Replace existing import snapshots for the same report date(s)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={refreshVehicleStatus}
              disabled={busy}
              onChange={(e) => onRefreshVehicleStatusChange(e.target.checked)}
            />
            Queue MCV status scrape for all VRNs (not only missing)
          </label>
        </div>
      ) : null}

      {busy && importProgress ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{
                width:
                  importProgress.phase === 'upload' && importProgress.uploadPct != null
                    ? `${importProgress.uploadPct}%`
                    : importProgress.phase === 'processing'
                      ? '100%'
                      : '12%',
              }}
            />
          </div>
          <p className="flex items-center gap-2 text-sm text-indigo-200">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            {importProgress.phase === 'upload'
              ? `Uploading… ${importProgress.uploadPct ?? 0}%`
              : `Processing on server… ${(importProgress.rowsProcessed ?? 0).toLocaleString()} rows${
                  importProgress.passesImported != null && importProgress.passesImported > 0
                    ? ` · ${importProgress.passesImported.toLocaleString()} passes`
                    : ''
                }`}
          </p>
        </div>
      ) : null}

      <Button className="w-full" disabled={!canImport} onClick={onImport}>
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {importProgress ? 'Importing…' : 'Working…'}
          </span>
        ) : (
          'Import'
        )}
      </Button>
    </Card>
  );
}
