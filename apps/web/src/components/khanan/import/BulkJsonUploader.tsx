'use client';

import { useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useKhananImportJob } from '@/components/khanan/import/KhananImportJobProvider';
import { cn } from '@/lib/utils';

interface BulkJsonUploaderProps {
  file: File | null;
  replaceExisting: boolean;
  refreshVehicleStatus: boolean;
}

export function BulkJsonUploader({
  file,
  replaceExisting,
  refreshVehicleStatus,
}: BulkJsonUploaderProps) {
  const { isActive, startBackgroundImport } = useKhananImportJob();
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file || isActive) {
      if (!file) startedRef.current = null;
      return;
    }
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (startedRef.current === key) return;
    startedRef.current = key;
    void startBackgroundImport(file, { replaceExisting, refreshVehicleStatus });
  }, [file, isActive, replaceExisting, refreshVehicleStatus, startBackgroundImport]);

  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-white">Large file (JSON Lines or big JSON array)</p>
      {file ? <p className="truncate text-xs text-text-secondary">{file.name}</p> : null}

      {isActive ? (
        <p className="text-xs text-indigo-200/90">
          Upload and import progress are shown at the top of this page.
        </p>
      ) : (
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 transition',
            isActive
              ? 'pointer-events-none border-slate-600/50 opacity-70'
              : 'border-slate-600/50 hover:border-indigo-500/40 hover:bg-indigo-500/5',
          )}
        >
          <input
            type="file"
            accept=".json,.jsonl,.ndjson,application/json"
            className="sr-only"
            disabled={isActive}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                startedRef.current = null;
                void startBackgroundImport(f, { replaceExisting, refreshVehicleStatus });
              }
              e.target.value = '';
            }}
          />
          <Upload className="h-6 w-6 text-slate-400" aria-hidden />
          <p className="mt-2 text-xs text-text-secondary">
            Chunked upload · safe to leave this page
          </p>
        </label>
      )}
    </Card>
  );
}
