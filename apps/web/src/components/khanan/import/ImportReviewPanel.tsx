'use client';

import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { useKhananImportJob } from '@/components/khanan/import/KhananImportJobProvider';
import type { ImportAnalyzeResult } from '@/lib/epass-import';
import { MULTI_DATE_IMPORT_HINT_THRESHOLD } from '@/lib/epass-import';
import { formatReportDateNumeric } from '@/lib/epass-report-date';
import { VRN_REPEAT_WARNING_MARK } from '@/lib/mcv-portal-status';
import { importTypeChipTone, importTypeLabel } from '@/lib/import-display';

interface ImportReviewPanelProps {
  analysis: ImportAnalyzeResult;
  reportDate: string;
  replaceExisting: boolean;
  refreshVehicleStatus: boolean;
  busy: boolean;
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
  useBackgroundImport,
  onReportDateChange,
  onReplaceExistingChange,
  onRefreshVehicleStatusChange,
  onImport,
}: ImportReviewPanelProps) {
  const { isActive: importActive } = useKhananImportJob();
  const canImport =
    Boolean(analysis.detectedType) && analysis.errors.length === 0 && !busy && !importActive;

  const vrnWarnings = analysis.warnings.filter((w) => w.includes(VRN_REPEAT_WARNING_MARK));
  const otherWarnings = analysis.warnings.filter((w) => !w.includes(VRN_REPEAT_WARNING_MARK));
  const multiDateCount = analysis.distinctDates?.count ?? 0;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={importTypeChipTone(analysis.detectedType)}>
          {importTypeLabel(analysis.detectedType)}
        </Chip>
        <span className="text-sm text-text-secondary tabular-nums">
          {analysis.rowCount.toLocaleString()} rows
        </span>
      </div>

      {analysis.detectedType === 'khanan_pass' ? (
        <p className="text-sm text-text-secondary tabular-nums">
          {multiDateCount.toLocaleString()} report dates
          {analysis.distinctVrns != null
            ? ` · ${analysis.distinctVrns.toLocaleString()} vehicles`
            : ''}
          {analysis.dateFrom && analysis.dateTo
            ? ` · ${formatReportDateNumeric(analysis.dateFrom)} to ${formatReportDateNumeric(analysis.dateTo)}`
            : ''}
        </p>
      ) : null}

      {useBackgroundImport ? (
        <p className="text-sm text-text-secondary">
          Large file — imports on the server. You can leave this page.
        </p>
      ) : null}

      {analysis.detectedType === 'khanan_pass' &&
      multiDateCount > MULTI_DATE_IMPORT_HINT_THRESHOLD ? (
        <Alert type="info">
          Multiple report dates in this file. After import, use <strong>Date range</strong> on
          Consigner to browse all dates.
        </Alert>
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

      {vrnWarnings.length > 0 ? (
        <Alert type="info">
          Some vehicles appear on more than one row (different challans or dates). All rows will
          import.
        </Alert>
      ) : null}

      {otherWarnings.length > 0 ? (
        <Alert type="warning">
          <ul className="list-inside list-disc space-y-1">
            {otherWarnings.map((warn) => (
              <li key={warn}>{warn}</li>
            ))}
          </ul>
        </Alert>
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
            Replace existing data for the same dates
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={refreshVehicleStatus}
              disabled={busy}
              onChange={(e) => onRefreshVehicleStatusChange(e.target.checked)}
            />
            Re-scrape vehicle status for all VRNs
          </label>
        </div>
      ) : null}

      <Button className="w-full" disabled={!canImport} onClick={onImport}>
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Starting…
          </span>
        ) : (
          'Import'
        )}
      </Button>
    </Card>
  );
}
