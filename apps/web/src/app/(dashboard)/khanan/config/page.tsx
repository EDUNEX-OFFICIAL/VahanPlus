'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { KhananConfigActions } from '@/components/khanan/config/KhananConfigActions';
import { KhananConfigAdvanced } from '@/components/khanan/config/KhananConfigAdvanced';
import { KhananConfigDangerZone } from '@/components/khanan/config/KhananConfigDangerZone';
import { KhananConfigHistory } from '@/components/khanan/config/KhananConfigHistory';
import { KhananConfigLiveScrape } from '@/components/khanan/config/KhananConfigLiveScrape';
import { KhananConfigPipeline } from '@/components/khanan/config/KhananConfigPipeline';
import { KhananConfigSpeed } from '@/components/khanan/config/KhananConfigSpeed';
import { KhananConfigStatusBar } from '@/components/khanan/config/KhananConfigStatusBar';
import { isScraperQueueReady, scrapeQueueInProgress } from '@/lib/scraper-control-mode';
import type { KhananScraperConfig, KhananScraperConfigPatch } from '@/lib/scraper-config-types';
import { formatClearDataSummary } from '@/lib/format-clear-data-summary';
import { SCRAPER_SPEED_PRESETS } from '@/lib/scraper-speed-presets';
import {
  invalidateEpassAndScraperData,
  pollingQueryOptions,
  staticQueryOptions,
} from '@/lib/query-config';
import {
  SCRAPER_CONFIG_QUERY_KEY,
  SCRAPER_JOBS_QUERY_KEY,
  SCRAPER_LIVE_QUERY_KEY,
  SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY,
  clearAllData,
  fetchScraperConfig,
  fetchScraperLive,
  patchScraperConfig,
  pauseScrapeQueue,
  resumeScrapeQueue,
  runDistrictRange,
  runDistrictScrape,
  stopScraping,
} from '@/lib/scraper-config';

const STOP_COOLDOWN_MAX_MS = 15_000;
const OPTIMISTIC_RUNNING_MAX_MS = 30_000;

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
  const [stopCooldown, setStopCooldown] = useState(false);
  const [optimisticRunning, setOptimisticRunning] = useState(false);
  const stopCooldownStartedAt = useRef<number | null>(null);
  const optimisticStartedAt = useRef<number | null>(null);
  const lastServerConfigVersion = useRef<number | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: SCRAPER_CONFIG_QUERY_KEY,
    queryFn: () => fetchScraperConfig(),
    ...staticQueryOptions,
    refetchInterval: stopCooldown ? 2_000 : 10_000,
  });

  const scrapeActive = useMemo(() => {
    if (!data?.status) return false;
    if (stopCooldown) return true;
    return scrapeQueueInProgress(data.status) > 0 || optimisticRunning;
  }, [data?.status, optimisticRunning, stopCooldown]);

  useEffect(() => {
    if (!stopCooldown || !data?.status) return;

    const started = stopCooldownStartedAt.current ?? Date.now();
    if (stopCooldownStartedAt.current == null) {
      stopCooldownStartedAt.current = started;
    }

    const elapsed = Date.now() - started;
    if (elapsed >= STOP_COOLDOWN_MAX_MS || isScraperQueueReady(data.status)) {
      setStopCooldown(false);
      stopCooldownStartedAt.current = null;
    }
  }, [stopCooldown, data?.status]);

  useEffect(() => {
    if (!optimisticRunning || !data?.status) return;

    if (scrapeQueueInProgress(data.status) > 0) {
      setOptimisticRunning(false);
      optimisticStartedAt.current = null;
      return;
    }

    const started = optimisticStartedAt.current ?? Date.now();
    if (optimisticStartedAt.current == null) {
      optimisticStartedAt.current = started;
    }
    if (Date.now() - started >= OPTIMISTIC_RUNNING_MAX_MS) {
      setOptimisticRunning(false);
      optimisticStartedAt.current = null;
    }
  }, [optimisticRunning, data?.status]);

  const { data: liveData, isLoading: liveLoading } = useQuery({
    queryKey: SCRAPER_LIVE_QUERY_KEY,
    queryFn: () => fetchScraperLive(),
    enabled: Boolean(data) && scrapeActive,
    staleTime: 0,
    gcTime: pollingQueryOptions.gcTime,
    refetchOnWindowFocus: false,
    refetchInterval: scrapeActive ? 4_000 : false,
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
      setShowCustom(data.config.speedPreset === 'custom');
    }
    lastServerConfigVersion.current = v;
  }, [data?.config]);

  useEffect(() => {
    if (data?.config?.speedPreset === 'custom') {
      setShowCustom(true);
    }
  }, [data?.config?.speedPreset]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const saveMutation = useMutation({
    mutationFn: async (patch: KhananScraperConfigPatch) => patchScraperConfig(patch),
    onSuccess: (res) => {
      setSaveError(null);
      setJustSaved(true);
      setDraft(res.config);
      setDraftPreset(null);
      setShowCustom(res.config.speedPreset === 'custom');
      queryClient.setQueryData(SCRAPER_CONFIG_QUERY_KEY, res);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const controlsBusy = saveMutation.isPending || actionBusy;

  const persistDistrictRange = useCallback(
    async (from: string, to: string) => {
      const res = await patchScraperConfig({
        districtRangeFrom: from,
        districtRangeTo: to,
      });
      setDraft(res.config);
      queryClient.setQueryData(SCRAPER_CONFIG_QUERY_KEY, res);
    },
    [queryClient],
  );

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
      districtRangeFrom: draft.districtRangeFrom,
      districtRangeTo: draft.districtRangeTo,
      scheduleReportDateMode: draft.scheduleReportDateMode,
      allowDataWipe: draft.allowDataWipe,
    };
    const savingCustom = showCustom || draft.speedPreset === 'custom';
    if (draftPreset && !savingCustom) {
      body.speedPreset = draftPreset;
    }
    saveMutation.mutate(body);
  };

  const runAction = async (fn: () => Promise<{ message?: string; enqueued?: number }>) => {
    setActionBusy(true);
    try {
      const res = await fn();
      await queryClient.invalidateQueries({ queryKey: SCRAPER_CONFIG_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: SCRAPER_LIVE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: SCRAPER_SNAPSHOT_HISTORY_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: SCRAPER_JOBS_QUERY_KEY });
      if (res.enqueued != null) {
        return res.enqueued === 0 ? 'Nothing to start' : 'Started';
      }
      return res.message ?? 'Done';
    } finally {
      setActionBusy(false);
    }
  };

  const markOptimisticRunning = () => {
    setOptimisticRunning(true);
    optimisticStartedAt.current = Date.now();
  };

  const beginStopCooldown = () => {
    setOptimisticRunning(false);
    optimisticStartedAt.current = null;
    setStopCooldown(true);
    stopCooldownStartedAt.current = Date.now();
  };

  if (isLoading || !draft || !data) {
    return (
      <PageStack>
        <Card className="animate-pulse p-12">
          <div className="h-24 rounded bg-surface-deep" />
        </Card>
      </PageStack>
    );
  }

  if (isError) {
    return <DataErrorCard onRetry={() => refetch()} />;
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(data.config) || draftPreset != null;

  return (
    <PageStack>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">KhananSoft</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Bihar portal fetch</h2>
      </Card>

      <KhananConfigStatusBar
        status={data.status}
        updatedAt={draft.updatedAt}
        stopCooldown={stopCooldown}
        optimisticRunning={optimisticRunning}
      />

      <KhananConfigActions
        status={data.status}
        defaultDistrictDate={draft.defaultDistrictDate}
        districtRangeFrom={draft.districtRangeFrom ?? null}
        districtRangeTo={draft.districtRangeTo ?? null}
        scheduleTimezone={draft.scheduleTimezone}
        stopCooldown={stopCooldown}
        optimisticRunning={optimisticRunning}
        busy={controlsBusy}
        onPersistDistrictRange={persistDistrictRange}
        onRunDistrict={(date) =>
          runAction(async () => {
            const res = await runDistrictScrape(date);
            if (res.enqueued !== 0) markOptimisticRunning();
            return res;
          })
        }
        onRunDistrictRange={(from, to, confirmLargeRange) =>
          runAction(async () => {
            const res = await runDistrictRange(from, to, confirmLargeRange);
            if (res.enqueued !== 0) markOptimisticRunning();
            return res;
          })
        }
        onPause={() => runAction(() => pauseScrapeQueue())}
        onResume={() => runAction(() => resumeScrapeQueue())}
        onStop={() =>
          runAction(async () => {
            const res = await stopScraping();
            beginStopCooldown();
            return res;
          })
        }
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
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  ...SCRAPER_SPEED_PRESETS[p],
                  speedPreset: p,
                }
              : prev,
          );
          setJustSaved(false);
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

      {scrapeActive ? (
        <KhananConfigLiveScrape
          status={data.status}
          scrapeActive={scrapeActive}
          live={liveData}
          loading={liveLoading}
        />
      ) : null}

      <KhananConfigHistory status={data.status} scrapeActive={scrapeActive} />

      <KhananConfigDangerZone
        allowDataWipe={draft.allowDataWipe}
        busy={controlsBusy}
        onAllowDataWipeChange={async (enabled) => {
          setActionBusy(true);
          try {
            const res = await patchScraperConfig({ allowDataWipe: enabled });
            setDraft(res.config);
            queryClient.setQueryData(SCRAPER_CONFIG_QUERY_KEY, res);
          } finally {
            setActionBusy(false);
          }
        }}
        onClear={async () => {
          setActionBusy(true);
          try {
            const result = await clearAllData('DELETE ALL DATA');
            await invalidateEpassAndScraperData(queryClient);
            const d = result.deleted;
            return `Removed ${formatClearDataSummary(d)}.`;
          } finally {
            setActionBusy(false);
          }
        }}
      />
    </PageStack>
  );
}
