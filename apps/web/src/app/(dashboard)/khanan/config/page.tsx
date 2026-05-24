'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KhananConfigActions } from '@/components/khanan/config/KhananConfigActions';
import { KhananConfigAdvanced } from '@/components/khanan/config/KhananConfigAdvanced';
import { KhananConfigJobsTable } from '@/components/khanan/config/KhananConfigJobsTable';
import { KhananConfigPipeline } from '@/components/khanan/config/KhananConfigPipeline';
import { KhananConfigSpeed } from '@/components/khanan/config/KhananConfigSpeed';
import { KhananConfigStatusBar } from '@/components/khanan/config/KhananConfigStatusBar';
import { getToken } from '@/lib/auth';
import type { KhananScraperConfig, KhananScraperConfigPatch } from '@/lib/scraper-config-types';
import {
  SCRAPER_CONFIG_QUERY_KEY,
  SCRAPER_JOBS_QUERY_KEY,
  fetchScraperConfig,
  fetchScraperJobs,
  patchScraperConfig,
  pauseQueue,
  resumeQueue,
  runDistrictRange,
  runDistrictScrape,
} from '@/lib/scraper-config';

const SPEED_FIELDS = new Set([
  'workerConcurrency',
  'rateLimitMax',
  'rateLimitDurationMs',
  'postDelayMs',
  'fanoutStaggerMs',
  'fetchTimeoutMs',
  'fetchRetries',
]);

export default function KhananConfigPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<KhananScraperConfig | null>(null);
  const [draftPreset, setDraftPreset] = useState<'safe' | 'balanced' | 'fast' | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const lastServerConfigVersion = useRef<number | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: SCRAPER_CONFIG_QUERY_KEY,
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchScraperConfig(token);
    },
    refetchInterval: 10_000,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: SCRAPER_JOBS_QUERY_KEY,
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchScraperJobs(token);
    },
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!data?.config) return;
    setDraft((prev) => {
      if (!prev) return data.config;
      if (
        prev.configVersion === data.config.configVersion &&
        prev.updatedAt === data.config.updatedAt
      ) {
        return prev;
      }
      return data.config;
    });
  }, [data?.config?.configVersion, data?.config?.updatedAt, data?.config]);

  useEffect(() => {
    if (!data?.config) return;
    const v = data.config.configVersion;
    if (lastServerConfigVersion.current !== undefined && lastServerConfigVersion.current !== v) {
      setDraftPreset(null);
      setShowCustom(false);
    }
    lastServerConfigVersion.current = v;
  }, [data?.config?.configVersion]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const saveMutation = useMutation({
    mutationFn: async (patch: KhananScraperConfigPatch) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return patchScraperConfig(token, patch);
    },
    onSuccess: (res) => {
      setSaveError(null);
      setJustSaved(true);
      setDraft(res.config);
      setDraftPreset(null);
      setShowCustom(false);
      queryClient.setQueryData(SCRAPER_CONFIG_QUERY_KEY, res);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const controlsBusy = saveMutation.isPending || actionBusy;

  const patchDraft = useCallback((patch: Partial<KhananScraperConfig>) => {
    const touchesSpeed = Object.keys(patch).some((k) => SPEED_FIELDS.has(k));
    setDraft((prev) =>
      prev
        ? { ...prev, ...patch, ...(touchesSpeed ? { speedPreset: 'custom' as const } : {}) }
        : prev,
    );
    if (touchesSpeed) setDraftPreset(null);
    setJustSaved(false);
  }, []);

  const handleSave = () => {
    if (!draft || !data) return;
    const body: KhananScraperConfigPatch = {
      autoFanout: draft.autoFanout,
      skipChallan: draft.skipChallan,
      skipChallanPass: draft.skipChallanPass,
      skipVehicleStatus: draft.skipVehicleStatus,
      workerConcurrency: draft.workerConcurrency,
      rateLimitMax: draft.rateLimitMax,
      rateLimitDurationMs: draft.rateLimitDurationMs,
      postDelayMs: draft.postDelayMs,
      fanoutStaggerMs: draft.fanoutStaggerMs,
      fetchTimeoutMs: draft.fetchTimeoutMs,
      fetchRetries: draft.fetchRetries,
      storeRawCapture: draft.storeRawCapture,
      maxConsignerJobs: draft.maxConsignerJobs,
      districtReportUrl: draft.districtReportUrl,
      districtRowLimit: draft.districtRowLimit,
      scheduleCron: draft.scheduleCron,
      scheduleTimezone: draft.scheduleTimezone,
      defaultDistrictDate: draft.defaultDistrictDate,
      scheduleReportDateMode: draft.scheduleReportDateMode,
    };
    if (draftPreset) body.speedPreset = draftPreset;
    saveMutation.mutate(body);
  };

  const tokenAction = async (
    fn: (token: string) => Promise<{ message?: string; enqueued?: number }>,
  ) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    setActionBusy(true);
    try {
      const res = await fn(token);
      await queryClient.invalidateQueries({ queryKey: SCRAPER_CONFIG_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: SCRAPER_JOBS_QUERY_KEY });
      if (res.enqueued != null) {
        return res.enqueued === 0 ? 'Nothing to queue' : `Queued ${res.enqueued} jobs`;
      }
      return res.message ?? 'Done';
    } finally {
      setActionBusy(false);
    }
  };

  if (isLoading || !draft || !data) {
    return (
      <div className="animate-slide-right space-y-6">
        <Card className="animate-pulse p-12">
          <div className="h-24 rounded bg-surface-deep" />
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-500/30">
        <p className="text-sm text-red-400">Load failed</p>
        <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(data.config) || draftPreset != null;

  return (
    <div className="animate-slide-right space-y-6">
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">KhananSoft</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Bihar portal fetch</h2>
      </Card>

      <KhananConfigStatusBar status={data.status} updatedAt={draft.updatedAt} />

      <KhananConfigActions
        status={data.status}
        defaultDistrictDate={draft.defaultDistrictDate}
        scheduleTimezone={draft.scheduleTimezone}
        busy={controlsBusy}
        onRunDistrict={(date) => tokenAction((t) => runDistrictScrape(t, date))}
        onRunDistrictRange={(from, to, confirmLargeRange) =>
          tokenAction((t) => runDistrictRange(t, from, to, confirmLargeRange))
        }
        onPause={async () => {
          const token = getToken();
          if (!token) throw new Error('Not authenticated');
          setActionBusy(true);
          try {
            await pauseQueue(token);
            await queryClient.invalidateQueries({ queryKey: SCRAPER_CONFIG_QUERY_KEY });
          } finally {
            setActionBusy(false);
          }
        }}
        onResume={async () => {
          const token = getToken();
          if (!token) throw new Error('Not authenticated');
          setActionBusy(true);
          try {
            await resumeQueue(token);
            await queryClient.invalidateQueries({ queryKey: SCRAPER_CONFIG_QUERY_KEY });
          } finally {
            setActionBusy(false);
          }
        }}
      />

      <KhananConfigSpeed
        config={draft}
        draftPreset={draftPreset}
        showCustom={showCustom}
        dirty={dirty}
        saveBusy={controlsBusy}
        justSaved={justSaved}
        saveError={saveError}
        onSelectPreset={(p) => {
          setDraftPreset(p);
          setShowCustom(false);
        }}
        onToggleCustom={() => setShowCustom((v) => !v)}
        onChange={patchDraft}
        onSave={handleSave}
        disabled={controlsBusy}
      />

      <KhananConfigPipeline config={draft} onChange={patchDraft} disabled={controlsBusy} />

      <KhananConfigAdvanced
        config={draft}
        open={advancedOpen}
        onToggle={() => setAdvancedOpen((v) => !v)}
        onChange={patchDraft}
        disabled={controlsBusy}
      />

      {dirty ? (
        <Card className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 border-amber-500/40 bg-surface-elevated/95 shadow-lg backdrop-blur">
          <p className="text-sm text-white">Unsaved</p>
          <Button disabled={controlsBusy} onClick={handleSave}>
            Save
          </Button>
        </Card>
      ) : null}

      <KhananConfigJobsTable jobs={jobsData?.items ?? []} loading={jobsLoading} />
    </div>
  );
}
