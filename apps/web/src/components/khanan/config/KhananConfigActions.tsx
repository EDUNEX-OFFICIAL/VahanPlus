'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScraperConfigActionError } from '@/lib/scraper-config';
import { countIsoDaysInclusive, defaultDistrictDateInput } from '@/lib/scraper-config-default-date';
import {
  canStartScrape,
  getScraperControlMode,
  type ScraperControlMode,
} from '@/lib/scraper-control-mode';
import type { ScraperConfigStatus } from '@/lib/scraper-config-types';

const LARGE_RANGE_CONFIRM_THRESHOLD = 90;

interface Props {
  status: ScraperConfigStatus;
  defaultDistrictDate: string | null;
  districtRangeFrom: string | null;
  districtRangeTo: string | null;
  scheduleTimezone: string;
  stopCooldown?: boolean;
  optimisticRunning?: boolean;
  onRunDistrict: (date: string) => Promise<string>;
  onRunDistrictRange: (from: string, to: string, confirmLargeRange: boolean) => Promise<string>;
  onPersistDistrictRange: (from: string, to: string) => Promise<void>;
  onPause: () => Promise<string>;
  onResume: () => Promise<string>;
  onStop: () => Promise<string>;
  busy?: boolean;
}

export function KhananConfigActions({
  status,
  defaultDistrictDate,
  districtRangeFrom,
  districtRangeTo,
  scheduleTimezone,
  stopCooldown = false,
  optimisticRunning = false,
  onRunDistrict,
  onRunDistrictRange,
  onPersistDistrictRange,
  onPause,
  onResume,
  onStop,
  busy = false,
}: Props) {
  const [reportDate, setReportDate] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mode: ScraperControlMode = getScraperControlMode(status, {
    stopCooldown,
    optimisticRunning,
  });

  const controlsLocked = busy || mode === 'stopping';
  const canRun = canStartScrape(mode, busy);
  const showPause = mode === 'running';
  const showResume = mode === 'paused';
  const showStop = mode === 'running' || mode === 'paused';

  useEffect(() => {
    setReportDate(defaultDistrictDateInput(defaultDistrictDate, scheduleTimezone));
  }, [defaultDistrictDate, scheduleTimezone]);

  useEffect(() => {
    setRangeFrom(districtRangeFrom ?? '');
    setRangeTo(districtRangeTo ?? '');
  }, [districtRangeFrom, districtRangeTo]);

  async function persistRangeIfComplete() {
    if (!rangeFrom || !rangeTo) return;
    if (countIsoDaysInclusive(rangeFrom, rangeTo) == null) return;
    try {
      await onPersistDistrictRange(rangeFrom, rangeTo);
    } catch {
      /* parent surfaces errors if needed */
    }
  }

  async function run(action: () => Promise<string>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    setMessage(null);
    try {
      const msg = await action();
      setMessage(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function runRange() {
    if (!rangeFrom || !rangeTo) {
      setError('From and To required');
      return;
    }
    const days = countIsoDaysInclusive(rangeFrom, rangeTo);
    if (days == null) {
      setError('Invalid range');
      return;
    }

    const tryEnqueue = async (confirmLargeRange: boolean) =>
      onRunDistrictRange(rangeFrom, rangeTo, confirmLargeRange);

    setError(null);
    setMessage(null);
    try {
      if (days > LARGE_RANGE_CONFIRM_THRESHOLD) {
        if (!window.confirm(`Run district reports for ${days} days?`)) return;
        setMessage(await tryEnqueue(true));
        return;
      }
      setMessage(await tryEnqueue(false));
    } catch (e) {
      if (e instanceof ScraperConfigActionError && e.requiresConfirm) {
        const n = e.dayCount ?? days;
        if (!window.confirm(`Run district reports for ${n} days?`)) return;
        try {
          setMessage(await tryEnqueue(true));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed');
        }
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  const snap = status.latestSnapshot;
  const snapLabel = snap?.reportDate ?? '—';

  return (
    <Card>
      <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Actions</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Last report: <span className="text-white">{snapLabel}</span>
      </p>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-text-secondary">
          Date
          <Input
            type="date"
            className="mt-1"
            value={reportDate}
            disabled={controlsLocked || !canRun}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </label>
        <Button
          variant="destructive"
          disabled={controlsLocked || !canRun || !reportDate}
          onClick={() => run(() => onRunDistrict(reportDate), `Run scrapper for ${reportDate}?`)}
        >
          Run scrapper
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-700/50 pt-4">
        <label className="text-xs text-text-secondary">
          From
          <Input
            type="date"
            className="mt-1"
            value={rangeFrom}
            disabled={controlsLocked || !canRun}
            onChange={(e) => setRangeFrom(e.target.value)}
            onBlur={() => void persistRangeIfComplete()}
          />
        </label>
        <label className="text-xs text-text-secondary">
          To
          <Input
            type="date"
            className="mt-1"
            value={rangeTo}
            disabled={controlsLocked || !canRun}
            onChange={(e) => setRangeTo(e.target.value)}
            onBlur={() => void persistRangeIfComplete()}
          />
        </label>
        <Button
          variant="secondary"
          disabled={controlsLocked || !canRun || !rangeFrom || !rangeTo}
          onClick={() => runRange()}
        >
          Run range
        </Button>
      </div>

      {showPause || showResume || showStop ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700/50 pt-4">
          {showResume ? (
            <Button
              variant="success"
              disabled={controlsLocked}
              onClick={() => run(() => onResume(), 'Resume scraping queue?')}
            >
              Resume
            </Button>
          ) : null}
          {showPause ? (
            <Button
              variant="warning"
              disabled={controlsLocked}
              onClick={() =>
                run(
                  () => onPause(),
                  'Pause queue? Jobs in progress may finish; new jobs will wait.',
                )
              }
            >
              Pause
            </Button>
          ) : null}
          {showStop ? (
            <Button
              variant="destructive"
              disabled={controlsLocked}
              onClick={() =>
                run(() => onStop(), 'Stop scraping? Work in progress will be cancelled.')
              }
            >
              Stop
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
