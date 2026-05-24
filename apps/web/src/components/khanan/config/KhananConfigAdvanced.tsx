'use client';

import { useMemo, useState } from 'react';
import { Switch } from '@/components/ui/Switch';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  dailyCronFromTime,
  formatDailyScheduleSummary,
  timeFromDailyCron,
} from '@/lib/scraper-config-labels';
import type { KhananScraperConfig } from '@/lib/scraper-config-types';

interface Props {
  config: KhananScraperConfig;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<KhananScraperConfig>) => void;
  disabled?: boolean;
}

export function KhananConfigAdvanced({ config, open, onToggle, onChange, disabled }: Props) {
  const parsedTime = useMemo(() => timeFromDailyCron(config.scheduleCron), [config.scheduleCron]);
  const [useCustomCron, setUseCustomCron] = useState(
    () => Boolean(config.scheduleCron) && !parsedTime,
  );
  const scheduleSummary = formatDailyScheduleSummary(config.scheduleCron, config.scheduleTimezone);

  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Advanced</h3>
        <span className="text-xs text-indigo-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-700/50 bg-surface-deep/30 p-3">
            <Switch
              id="scheduleEnabled"
              label="Daily district report"
              checked={Boolean(config.scheduleCron)}
              disabled={disabled}
              onChange={(enabled) => {
                if (!enabled) {
                  onChange({ scheduleCron: null });
                  setUseCustomCron(false);
                  return;
                }
                const cron = dailyCronFromTime(parsedTime || '06:30') ?? '30 6 * * *';
                onChange({ scheduleCron: cron });
              }}
            />
            {!useCustomCron ? (
              <>
                <label className="block text-xs text-text-secondary">
                  Time
                  <Input
                    type="time"
                    className="mt-1 w-40"
                    value={parsedTime || '06:30'}
                    disabled={disabled || !config.scheduleCron}
                    onChange={(e) => {
                      const cron = dailyCronFromTime(e.target.value);
                      onChange({ scheduleCron: cron });
                    }}
                  />
                </label>
                {config.scheduleCron ? (
                  <p className="text-xs text-indigo-300/90">{scheduleSummary}</p>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              className="text-xs text-indigo-400 hover:text-indigo-300"
              onClick={() => setUseCustomCron((v) => !v)}
            >
              {useCustomCron ? 'Simple time' : 'Cron'}
            </button>
            {useCustomCron ? (
              <label className="block text-xs text-text-secondary">
                Cron
                <Input
                  className="mt-1 font-mono text-xs"
                  placeholder="30 6 * * *"
                  value={config.scheduleCron ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange({ scheduleCron: e.target.value.trim() || null })}
                />
              </label>
            ) : null}
            <label className="block text-xs text-text-secondary">
              Timezone
              <Input
                className="mt-1 w-48"
                value={config.scheduleTimezone}
                disabled={disabled}
                onChange={(e) => onChange({ scheduleTimezone: e.target.value })}
              />
            </label>
            <label className="block text-xs text-text-secondary">
              Scheduled report date
              <select
                className="mt-1 block w-48 rounded-xl border border-slate-700/50 bg-surface-deep px-3 py-2 text-sm text-white"
                value={config.scheduleReportDateMode ?? 'yesterday'}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    scheduleReportDateMode: e.target.value as
                      | 'yesterday'
                      | 'today'
                      | 'none',
                  })
                }
              >
                <option value="yesterday">Yesterday</option>
                <option value="today">Today</option>
                <option value="none">Portal default</option>
              </select>
            </label>
          </div>

          <label className="block text-xs text-text-secondary">
            Default date (Actions)
            <Input
              type="date"
              className="mt-1 w-40"
              value={config.defaultDistrictDate ?? ''}
              disabled={disabled}
              onChange={(e) =>
                onChange({ defaultDistrictDate: e.target.value.trim() || null })
              }
            />
          </label>

          <label className="block text-xs text-text-secondary">
            Report URL
            <Input
              className="mt-1 font-mono text-xs"
              value={config.districtReportUrl}
              disabled={disabled}
              onChange={(e) => onChange({ districtReportUrl: e.target.value })}
            />
          </label>
          <label className="block text-xs text-text-secondary">
            District limit
            <Input
              type="number"
              min={1}
              max={200}
              className="mt-1 w-32"
              value={config.districtRowLimit}
              disabled={disabled}
              onChange={(e) => onChange({ districtRowLimit: Number(e.target.value) })}
            />
          </label>
          <Switch
            id="storeRawCapture"
            label="Raw logs"
            checked={config.storeRawCapture}
            disabled={disabled}
            onChange={(v) => onChange({ storeRawCapture: v })}
          />
        </div>
      ) : null}
    </Card>
  );
}
