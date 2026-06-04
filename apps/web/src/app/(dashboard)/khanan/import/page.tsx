'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Input } from '@/components/ui/Input';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { EPASS_SNAPSHOTS_QUERY_KEY } from '@/lib/epass';
import {
  analyzeImport,
  buildDuplicateVrnWarnings,
  commitImport,
  type ImportAnalyzeResult,
  type ImportDetectedType,
} from '@/lib/epass-import';
import { parseImportFile } from '@/lib/spreadsheet-parse';

export default function ImportDataPage() {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [analysis, setAnalysis] = useState<ImportAnalyzeResult | null>(null);
  const [reportDate, setReportDate] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [refreshVehicleStatus, setRefreshVehicleStatus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setMessage(null);
      setAnalysis(null);

      setBusy(true);
      try {
        const parsed = await parseImportFile(file);
        setFileName(file.name);
        setHeaders(parsed.headers);
        setRows(parsed.rows);

        const result = await analyzeImport(
          parsed.headers,
          parsed.rows.slice(0, 5),
          parsed.rows.length,
          parsed.rows,
        );
        const dupWarnings =
          result.detectedType === 'vehicle_status' || result.detectedType === 'khanan_pass'
            ? buildDuplicateVrnWarnings(parsed.rows, result.mapping)
            : [];
        setAnalysis({
          ...result,
          warnings: [...result.warnings, ...dupWarnings],
          rowCount: parsed.rows.length,
        });
        if (result.detectedType === 'district_snapshot' && !reportDate) {
          setReportDate(new Date().toISOString().slice(0, 10));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Analyze failed');
        setFileName(null);
        setHeaders([]);
        setRows([]);
      } finally {
        setBusy(false);
      }
    },
    [reportDate],
  );

  async function handleImport() {
    if (!analysis?.detectedType) {
      setError('No recognized format');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await commitImport({
        type: analysis.detectedType as ImportDetectedType,
        mapping: analysis.mapping,
        rows,
        reportDate: analysis.detectedType === 'district_snapshot' ? reportDate : undefined,
        replaceExisting: analysis.detectedType === 'khanan_pass' ? replaceExisting : undefined,
        refreshVehicleStatus:
          analysis.detectedType === 'khanan_pass' ? refreshVehicleStatus : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: EPASS_SNAPSHOTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['epass'] });
      if (result.rowsImported != null) {
        setMessage(`Imported ${result.rowsImported} district rows.`);
      } else if (result.upserted != null) {
        const skippedNote =
          result.skipped != null && result.skipped > 0
            ? ` (${result.skipped} blank VRN row(s) skipped)`
            : '';
        setMessage(`Imported ${result.upserted} vehicle status rows${skippedNote}.`);
      } else if (result.passesImported != null) {
        const queueNote =
          result.vrnsQueued != null && result.vrnsQueued > 0
            ? ` · ${result.vrnsQueued} MCV job(s) queued`
            : '';
        setMessage(
          `Imported ${result.passesImported} pass(es) across ${result.snapshotsCreated ?? 0} snapshot(s)${queueNote}.`,
        );
      } else {
        setMessage('Import complete.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageStack>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">KhananSoft</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Import Data</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Khanan pass template:{' '}
          <a href="/khanan-import-template.csv" className="text-indigo-300 underline" download>
            CSV headers + example row
          </a>
        </p>
      </Card>

      <Card>
        <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          CSV or Excel file
        </label>
        <Input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="mt-2"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {fileName ? (
          <p className="mt-2 text-sm text-text-secondary">
            {fileName} · {rows.length} rows
          </p>
        ) : null}
      </Card>

      {error ? <DataErrorCard message={error} /> : null}

      {message ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-emerald-100">{message}</p>
        </Card>
      ) : null}

      {analysis ? (
        <Card>
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Detected format
          </h3>
          <p className="mt-2 text-sm text-white">{analysis.detectedType ?? 'Unknown'}</p>
          <p className="mt-1 text-xs text-text-secondary">{analysis.rowCount} data row(s)</p>
          {analysis.detectedType === 'khanan_pass' ? (
            <p className="mt-1 text-xs text-text-secondary">
              {analysis.distinctDates?.count ?? 0} report date(s)
              {analysis.distinctDates?.sample?.length
                ? ` (e.g. ${analysis.distinctDates.sample.join(', ')})`
                : ''}
              · {analysis.distinctVrns ?? 0} distinct VRN(s)
            </p>
          ) : null}
          {analysis.errors.length > 0 ? (
            <ul className="mt-3 list-inside list-disc text-sm text-red-300">
              {analysis.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}
          {analysis.warnings.length > 0 ? (
            <ul className="mt-3 list-inside list-disc text-sm text-amber-200">
              {analysis.warnings.map((warn) => (
                <li key={warn}>{warn}</li>
              ))}
            </ul>
          ) : null}
          {Object.keys(analysis.mapping).length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-text-secondary">
                    <th className="py-2 pr-4">Field</th>
                    <th className="py-2">File column</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analysis.mapping).map(([field, col]) => (
                    <tr key={field} className="border-t border-border-default/50">
                      <td className="py-2 pr-4 font-medium text-white">{field}</td>
                      <td className="py-2 text-text-secondary">{col}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {analysis.detectedType === 'district_snapshot' ? (
            <label className="mt-4 block text-xs text-text-secondary">
              Report date
              <Input
                type="date"
                className="mt-1"
                value={reportDate}
                disabled={busy}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </label>
          ) : null}
          {analysis.detectedType === 'khanan_pass' ? (
            <div className="mt-4 space-y-2 text-sm text-text-secondary">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  disabled={busy}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                />
                Replace existing import snapshots for the same report date(s)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={refreshVehicleStatus}
                  disabled={busy}
                  onChange={(e) => setRefreshVehicleStatus(e.target.checked)}
                />
                Queue MCV status scrape for all VRNs (not only missing)
              </label>
            </div>
          ) : null}
          <Button
            className="mt-4"
            disabled={busy || !analysis.detectedType || analysis.errors.length > 0}
            onClick={() => void handleImport()}
          >
            Import
          </Button>
        </Card>
      ) : headers.length > 0 && !analysis ? (
        <EmptyStateCard message="No data available" />
      ) : null}
    </PageStack>
  );
}
