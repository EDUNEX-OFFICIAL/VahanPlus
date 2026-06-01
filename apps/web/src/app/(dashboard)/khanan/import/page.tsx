'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Input } from '@/components/ui/Input';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { EPASS_SNAPSHOTS_QUERY_KEY } from '@/lib/epass';
import {
  analyzeImport,
  commitImport,
  parseCsv,
  type ImportAnalyzeResult,
  type ImportDetectedType,
} from '@/lib/epass-import';

export default function ImportDataPage() {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [analysis, setAnalysis] = useState<ImportAnalyzeResult | null>(null);
  const [reportDate, setReportDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setMessage(null);
      setAnalysis(null);
      const text = await file.text();
      const parsed = parseCsv(text);
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);

      setBusy(true);
      try {
        const result = await analyzeImport(parsed.headers, parsed.rows.slice(0, 5));
        setAnalysis(result);
        if (result.detectedType === 'district_snapshot' && !reportDate) {
          setReportDate(new Date().toISOString().slice(0, 10));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Analyze failed');
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
      });
      await queryClient.invalidateQueries({ queryKey: EPASS_SNAPSHOTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['epass'] });
      if (result.rowsImported != null) {
        setMessage(`Imported ${result.rowsImported} district rows.`);
      } else if (result.upserted != null) {
        setMessage(`Imported ${result.upserted} vehicle status rows.`);
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
      </Card>

      <Card>
        <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          CSV file
        </label>
        <Input
          type="file"
          accept=".csv,text/csv"
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

      {error ? (
        <Card className="border-red-500/30">
          <p className="text-sm font-semibold text-red-400">{error}</p>
        </Card>
      ) : null}

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
          {analysis.errors.length > 0 ? (
            <ul className="mt-3 list-inside list-disc text-sm text-red-300">
              {analysis.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}
          {Object.keys(analysis.mapping).length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-text-secondary">
                    <th className="py-2 pr-4">Field</th>
                    <th className="py-2">CSV column</th>
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
