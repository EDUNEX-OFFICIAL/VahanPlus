'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { BulkJsonUploader } from '@/components/khanan/import/BulkJsonUploader';
import { ImportFileDropzone } from '@/components/khanan/import/ImportFileDropzone';
import { ImportProgressCard } from '@/components/khanan/import/ImportProgressCard';
import { ImportReviewPanel } from '@/components/khanan/import/ImportReviewPanel';
import { ImportSuccessCard } from '@/components/khanan/import/ImportSuccessCard';
import { KhananExportPanel } from '@/components/khanan/import/KhananExportPanel';
import { useKhananImportJob } from '@/components/khanan/import/KhananImportJobProvider';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { invalidateAfterEpassImport } from '@/lib/query-config';
import {
  analyzeImport,
  buildDuplicateVrnWarnings,
  buildKhananPassAnalyzeStatsClient,
  commitImport,
  type ImportAnalyzeResult,
  type ImportDetectedType,
  type ImportSuccessSummary,
} from '@/lib/epass-import';
import {
  isKhananJsonFile,
  parseKhananJsonArrayFile,
  rowsToNdjsonFile,
  shouldUseBulkUpload,
  SMALL_IMPORT_MAX_ROWS,
} from '@/lib/khanan-json-parse';

export default function ImportDataPage() {
  const queryClient = useQueryClient();
  const {
    job: importJob,
    isActive: importActive,
    successMessage: importSuccess,
    importSuccessSummary,
    errorMessage: importError,
    startBackgroundImport,
    cancelBackgroundImport,
    clearMessages,
  } = useKhananImportJob();

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [analysis, setAnalysis] = useState<ImportAnalyzeResult | null>(null);
  const [reportDate, setReportDate] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [refreshVehicleStatus, setRefreshVehicleStatus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [localSuccessSummary, setLocalSuccessSummary] = useState<ImportSuccessSummary | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const displayError = error ?? importError;
  const displayMessage = message ?? importSuccess;
  const displaySuccessSummary = localSuccessSummary ?? importSuccessSummary;

  const clearFile = useCallback(() => {
    if (importActive) {
      void cancelBackgroundImport();
    }
    setFileName(null);
    setRows([]);
    setAnalysis(null);
    setBulkMode(false);
    setBulkFile(null);
    setError(null);
    setMessage(null);
    setLocalSuccessSummary(null);
    if (!importActive) clearMessages();
  }, [importActive, cancelBackgroundImport, clearMessages]);

  const handleSmallJsonFile = useCallback(
    async (file: File) => {
      setError(null);
      setMessage(null);
      clearMessages();
      setAnalysis(null);
      setBulkMode(false);
      setBusy(true);
      try {
        const parsed = await parseKhananJsonArrayFile(file);
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
                dateFrom: khananStats.dateFrom,
                dateTo: khananStats.dateTo,
                distinctVrns: khananStats.distinctVrns,
              }
            : {}),
          warnings: [...result.warnings, ...(khananStats?.warnings ?? []), ...dupWarnings],
          rowCount: parsed.rows.length,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Analyze failed');
        setFileName(null);
        setRows([]);
      } finally {
        setBusy(false);
      }
    },
    [clearMessages],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!isKhananJsonFile(file.name)) {
        setError('Only JSON or JSON Lines files are supported.');
        return;
      }
      if (shouldUseBulkUpload(file)) {
        setBulkMode(true);
        setBulkFile(file);
        setFileName(file.name);
        setRows([]);
        setAnalysis(null);
        setError(null);
        setMessage(null);
        clearMessages();
        return;
      }
      await handleSmallJsonFile(file);
    },
    [handleSmallJsonFile, clearMessages],
  );

  async function handleImport() {
    if (!analysis?.detectedType) {
      setError('No recognized format');
      return;
    }
    if (importActive) return;

    setBusy(true);
    setError(null);
    clearMessages();
    setMessage(null);
    setLocalSuccessSummary(null);

    const useBackground =
      analysis.detectedType === 'khanan_pass' && rows.length > SMALL_IMPORT_MAX_ROWS;

    try {
      if (useBackground) {
        const ndjson = rowsToNdjsonFile(rows, fileName ?? 'import.json');
        await startBackgroundImport(ndjson, {
          expectedRows: rows.length,
          replaceExisting,
          refreshVehicleStatus,
          dateFrom: analysis.dateFrom,
          dateTo: analysis.dateTo,
          distinctDateCount: analysis.distinctDates?.count,
        });
      } else {
        const result = await commitImport({
          type: analysis.detectedType as ImportDetectedType,
          mapping: analysis.mapping,
          rows,
          reportDate: analysis.detectedType === 'district_snapshot' ? reportDate : undefined,
          replaceExisting: analysis.detectedType === 'khanan_pass' ? replaceExisting : undefined,
          refreshVehicleStatus:
            analysis.detectedType === 'khanan_pass' ? refreshVehicleStatus : undefined,
        });
        await invalidateAfterEpassImport(queryClient, {
          refreshVehicleStatus:
            analysis.detectedType === 'khanan_pass' ? refreshVehicleStatus : undefined,
        });
        if (result.passesImported != null) {
          const queueNote =
            result.vrnsQueued != null && result.vrnsQueued > 0
              ? ` · ${result.vrnsQueued} MCV job(s) queued`
              : '';
          setMessage(
            `Imported ${result.passesImported} pass(es) across ${result.snapshotsCreated ?? 0} snapshot(s)${queueNote}.`,
          );
          setLocalSuccessSummary({
            passesImported: result.passesImported,
            rowsSkipped: result.skipped ?? 0,
            snapshotsCreated: result.snapshotsCreated,
            dateFrom: analysis.dateFrom,
            dateTo: analysis.dateTo,
            distinctDateCount: analysis.distinctDates?.count,
          });
        } else {
          setMessage('Import complete.');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  const useBackgroundImport =
    analysis?.detectedType === 'khanan_pass' && rows.length > SMALL_IMPORT_MAX_ROWS;

  const showJobOnPage = importActive && importJob;

  return (
    <PageStack>
      {showJobOnPage ? (
        <Card className="space-y-2 border-indigo-500/30">
          <p className="text-sm font-semibold text-indigo-100">Import in progress</p>
          <ImportProgressCard job={importJob} />
          <p className="text-xs text-text-secondary">
            You can open other pages — import continues on the server.
          </p>
        </Card>
      ) : null}

      <ImportFileDropzone
        busy={busy}
        importActive={importActive}
        fileName={fileName}
        rowCount={rows.length}
        onFile={(file) => void handleFile(file)}
        onClear={clearFile}
      />

      <p className="text-xs text-text-secondary">
        For 15GB-scale data use JSON Lines (
        <code className="text-slate-300">jq -c &apos;.[]&apos; huge.json &gt; huge.jsonl</code>
        ).
      </p>

      {bulkMode ? (
        <BulkJsonUploader
          file={bulkFile}
          replaceExisting={replaceExisting}
          refreshVehicleStatus={refreshVehicleStatus}
        />
      ) : null}

      {bulkMode && !analysis && !importActive ? (
        <Card className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="rounded border-slate-600"
            />
            Replace existing data for the same dates
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={refreshVehicleStatus}
              onChange={(e) => setRefreshVehicleStatus(e.target.checked)}
              className="rounded border-slate-600"
            />
            Re-scrape vehicle status for all VRNs
          </label>
        </Card>
      ) : null}

      {displayError ? <DataErrorCard message={displayError} /> : null}

      {displayMessage ? (
        <ImportSuccessCard message={displayMessage} summary={displaySuccessSummary} />
      ) : null}

      {analysis && !importActive ? (
        <ImportReviewPanel
          analysis={analysis}
          reportDate={reportDate}
          replaceExisting={replaceExisting}
          refreshVehicleStatus={refreshVehicleStatus}
          busy={busy}
          useBackgroundImport={useBackgroundImport}
          onReportDateChange={setReportDate}
          onReplaceExistingChange={setReplaceExisting}
          onRefreshVehicleStatusChange={setRefreshVehicleStatus}
          onImport={() => void handleImport()}
        />
      ) : null}

      <KhananExportPanel />
    </PageStack>
  );
}
