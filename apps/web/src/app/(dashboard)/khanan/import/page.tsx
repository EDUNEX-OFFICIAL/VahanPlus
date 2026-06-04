'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { ImportFileDropzone } from '@/components/khanan/import/ImportFileDropzone';
import { ImportReviewPanel } from '@/components/khanan/import/ImportReviewPanel';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { EPASS_SNAPSHOTS_QUERY_KEY } from '@/lib/epass';
import {
  analyzeImport,
  buildDuplicateVrnWarnings,
  buildKhananPassAnalyzeStatsClient,
  commitImport,
  type ImportAnalyzeResult,
  type ImportDetectedType,
} from '@/lib/epass-import';
import { parseImportFile } from '@/lib/spreadsheet-parse';

export default function ImportDataPage() {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [analysis, setAnalysis] = useState<ImportAnalyzeResult | null>(null);
  const [reportDate, setReportDate] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [refreshVehicleStatus, setRefreshVehicleStatus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const clearFile = useCallback(() => {
    setFileName(null);
    setRows([]);
    setAnalysis(null);
    setError(null);
    setMessage(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setMessage(null);
      setAnalysis(null);

      setBusy(true);
      try {
        const parsed = await parseImportFile(file);
        setFileName(file.name);
        setRows(parsed.rows);

        const result = await analyzeImport(
          parsed.headers,
          parsed.rows.slice(0, 5),
          parsed.rows.length,
        );
        const khananStats =
          result.detectedType === 'khanan_pass'
            ? buildKhananPassAnalyzeStatsClient(parsed.rows, result.mapping)
            : null;
        const dupWarnings =
          result.detectedType === 'vehicle_status' || result.detectedType === 'khanan_pass'
            ? buildDuplicateVrnWarnings(parsed.rows, result.mapping)
            : [];
        setAnalysis({
          ...result,
          ...(khananStats
            ? {
                distinctDates: khananStats.distinctDates,
                distinctVrns: khananStats.distinctVrns,
              }
            : {}),
          warnings: [...result.warnings, ...(khananStats?.warnings ?? []), ...dupWarnings],
          rowCount: parsed.rows.length,
        });
        if (result.detectedType === 'district_snapshot' && !reportDate) {
          setReportDate(new Date().toISOString().slice(0, 10));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Analyze failed');
        setFileName(null);
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
      <ImportFileDropzone
        busy={busy}
        fileName={fileName}
        rowCount={rows.length}
        onFile={(file) => void handleFile(file)}
        onClear={clearFile}
      />

      {error ? <DataErrorCard message={error} /> : null}

      {message ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-emerald-100">{message}</p>
        </Card>
      ) : null}

      {analysis ? (
        <ImportReviewPanel
          analysis={analysis}
          reportDate={reportDate}
          replaceExisting={replaceExisting}
          refreshVehicleStatus={refreshVehicleStatus}
          busy={busy}
          onReportDateChange={setReportDate}
          onReplaceExistingChange={setReplaceExisting}
          onRefreshVehicleStatusChange={setRefreshVehicleStatus}
          onImport={() => void handleImport()}
        />
      ) : null}
    </PageStack>
  );
}
