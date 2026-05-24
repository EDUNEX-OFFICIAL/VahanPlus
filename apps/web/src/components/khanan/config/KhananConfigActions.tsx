'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScraperConfigActionError } from '@/lib/scraper-config';
import {
  countIsoDaysInclusive,
  defaultDistrictDateInput,
} from '@/lib/scraper-config-default-date';
import type { ScraperConfigStatus } from '@/lib/scraper-config-types';

const LARGE_RANGE_CONFIRM_THRESHOLD = 90;

interface Props {
  status: ScraperConfigStatus;
  defaultDistrictDate: string | null;
  scheduleTimezone: string;
  onRunDistrict: (date: string) => Promise<string>;
  onRunDistrictRange: (from: string, to: string, confirmLargeRange: boolean) => Promise<string>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  busy?: boolean;
}

export function KhananConfigActions({
  status,
  defaultDistrictDate,
  scheduleTimezone,
  onRunDistrict,
  onRunDistrictRange,
  onPause,
  onResume,
  busy,
}: Props) {
  const [reportDate, setReportDate] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReportDate(defaultDistrictDateInput(defaultDistrictDate, scheduleTimezone));
  }, [defaultDistrictDate, scheduleTimezone]);

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
        if (!window.confirm(`Queue ${days} district reports?`)) return;
        setMessage(await tryEnqueue(true));
        return;
      }
      setMessage(await tryEnqueue(false));
    } catch (e) {
      if (e instanceof ScraperConfigActionError && e.requiresConfirm) {
        const n = e.dayCount ?? days;
        if (!window.confirm(`Queue ${n} district reports?`)) return;
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
            disabled={busy}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </label>
        <Button
          variant="destructive"
          disabled={busy || !reportDate}
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
            disabled={busy}
            onChange={(e) => setRangeFrom(e.target.value)}
          />
        </label>
        <label className="text-xs text-text-secondary">
          To
          <Input
            type="date"
            className="mt-1"
            value={rangeTo}
            disabled={busy}
            onChange={(e) => setRangeTo(e.target.value)}
          />
        </label>
        <Button variant="secondary" disabled={busy || !rangeFrom || !rangeTo} onClick={() => runRange()}>
          Run range
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700/50 pt-4">
        {status.queue.isPaused ? (
          <Button
            variant="success"
            disabled={busy}
            onClick={() => run(async () => { await onResume(); return 'Resumed'; })}
          >
            Resume
          </Button>
        ) : (
          <Button
            variant="warning"
            disabled={busy}
            onClick={() =>
              run(
                async () => {
                  await onPause();
                  return 'Paused';
                },
                'Pause queue?',
              )
            }
          >
            Pause
          </Button>
        )}
      </div>
    </Card>
  );
}
