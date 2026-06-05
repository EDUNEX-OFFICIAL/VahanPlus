'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { CRM_CONFIG_QUERY_KEY, fetchCrmConfig, patchCrmConfig } from '@/lib/crm-config';
import type { CrmConfigDto } from '@/lib/crm-config-types';

const PRESET_DAYS = [7, 10, 15, 30, 45, 60] as const;

function numberField(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

function parseDays(raw: string, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(365, Math.floor(n)));
}

export default function CrmConfigPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: CRM_CONFIG_QUERY_KEY,
    queryFn: () => fetchCrmConfig(),
  });

  const [draft, setDraft] = useState<CrmConfigDto | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (data?.config) setDraft(data.config);
  }, [data?.config]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const saveMutation = useMutation({
    mutationFn: patchCrmConfig,
    onSuccess: (res) => {
      setSaveError(null);
      setJustSaved(true);
      setDraft(res.config);
      queryClient.setQueryData(CRM_CONFIG_QUERY_KEY, res);
      queryClient.invalidateQueries({ queryKey: ['crm', 'vehicle-expiry'] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  if (isError) {
    return (
      <PageStack>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">CRM Config</h1>
        <DataErrorCard
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </PageStack>
    );
  }

  if (isLoading || !draft) {
    return (
      <PageStack>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">CRM Config</h1>
        <Card className="h-40 animate-pulse bg-surface-secondary/40">
          <span className="sr-only">Loading</span>
        </Card>
      </PageStack>
    );
  }

  const dirty =
    draft.insuranceExpiryDays !== data?.config.insuranceExpiryDays ||
    draft.rcExpiryDays !== data?.config.rcExpiryDays ||
    draft.fitnessExpiryDays !== data?.config.fitnessExpiryDays ||
    draft.rcAdvanceEnabled !== data?.config.rcAdvanceEnabled;

  function applyPreset(days: number) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            insuranceExpiryDays: days,
            rcExpiryDays: days,
            fitnessExpiryDays: days,
          }
        : prev,
    );
  }

  function handleSave() {
    if (!draft) return;
    saveMutation.mutate({
      insuranceExpiryDays: draft.insuranceExpiryDays,
      rcExpiryDays: draft.rcExpiryDays,
      fitnessExpiryDays: draft.fitnessExpiryDays,
      rcAdvanceEnabled: draft.rcAdvanceEnabled,
    });
  }

  return (
    <PageStack>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">CRM Config</h1>
        <Link
          href="/crm/vehicle-expiry"
          className="text-sm text-indigo-300 hover:text-indigo-200 hover:underline"
        >
          Vehicle Expiry
        </Link>
      </div>

      <Card className="space-y-6 p-4 sm:p-6">
        <p className="text-sm font-semibold text-white">Auto-queue expiry windows</p>

        <div className="flex flex-wrap gap-2">
          {PRESET_DAYS.map((days) => (
            <Button
              key={days}
              type="button"
              variant="secondary"
              className="min-h-10 px-3 text-sm"
              onClick={() => applyPreset(days)}
            >
              All {days}d
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-wider text-text-secondary">
              Insurance days left
            </span>
            <input
              type="number"
              min={0}
              max={365}
              value={numberField(draft.insuranceExpiryDays)}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        insuranceExpiryDays: parseDays(e.target.value, prev.insuranceExpiryDays),
                      }
                    : prev,
                )
              }
              className="w-full rounded-xl border border-border-default bg-surface-secondary px-3 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-wider text-text-secondary">
              RC tax days left
            </span>
            <input
              type="number"
              min={0}
              max={365}
              value={numberField(draft.rcExpiryDays)}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, rcExpiryDays: parseDays(e.target.value, prev.rcExpiryDays) }
                    : prev,
                )
              }
              className="w-full rounded-xl border border-border-default bg-surface-secondary px-3 py-2.5 text-sm text-white"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-wider text-text-secondary">
              Fitness days left
            </span>
            <input
              type="number"
              min={0}
              max={365}
              value={numberField(draft.fitnessExpiryDays)}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        fitnessExpiryDays: parseDays(e.target.value, prev.fitnessExpiryDays),
                      }
                    : prev,
                )
              }
              className="w-full rounded-xl border border-border-default bg-surface-secondary px-3 py-2.5 text-sm text-white"
            />
          </label>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={draft.rcAdvanceEnabled}
            onChange={(e) =>
              setDraft((prev) => (prev ? { ...prev, rcAdvanceEnabled: e.target.checked } : prev))
            }
            className="h-4 w-4"
          />
          <span className="text-sm text-white">Fetch RC Advance data for queued vehicles</span>
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-border-default/60 pt-4">
          <Button
            variant="primary"
            disabled={!dirty || saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
          {justSaved ? <span className="text-sm text-emerald-300">Saved</span> : null}
          {saveError ? (
            <span className="text-sm text-rose-300" role="alert">
              {saveError}
            </span>
          ) : null}
          <span className="text-xs text-text-secondary tabular-nums">v{draft.configVersion}</span>
        </div>
      </Card>
    </PageStack>
  );
}
