'use client';

import { useMemo } from 'react';
import {
  formatReportDateLong,
  groupReportDateOptionsByYear,
  type ReportDateOption,
} from '@/lib/epass-report-date';

interface ReportDateYearSelectProps {
  idPrefix: string;
  options: ReportDateOption[];
  snapshotId: string;
  onChange: (snapshotId: string, reportDate: string) => void;
  inputClass: string;
}

export function ReportDateYearSelect({
  idPrefix,
  options,
  snapshotId,
  onChange,
  inputClass,
}: ReportDateYearSelectProps) {
  const yearGroups = useMemo(() => groupReportDateOptionsByYear(options), [options]);

  const selectedOption = useMemo(
    () => options.find((o) => o.snapshotId === snapshotId) ?? null,
    [options, snapshotId],
  );

  const selectedYear = useMemo(() => {
    if (!yearGroups.length) return null;
    const fromSelection = selectedOption
      ? yearGroups.find((g) => g.options.some((o) => o.snapshotId === selectedOption.snapshotId))
          ?.year
      : null;
    return fromSelection ?? yearGroups[0].year;
  }, [yearGroups, selectedOption]);

  const datesInYear = useMemo(() => {
    if (selectedYear == null) return [];
    return yearGroups.find((g) => g.year === selectedYear)?.options ?? [];
  }, [yearGroups, selectedYear]);

  const yearId = `${idPrefix}-report-year`;
  const dateId = `${idPrefix}-report-date`;
  const empty = options.length === 0;

  function handleYearChange(yearValue: string) {
    const year = Number(yearValue);
    const group = yearGroups.find((g) => g.year === year);
    if (!group?.options.length) return;

    const keepCurrent =
      selectedOption && group.options.some((o) => o.snapshotId === selectedOption.snapshotId);
    const next = keepCurrent ? selectedOption : group.options[0];
    onChange(next.snapshotId, next.reportDate);
  }

  function handleDateChange(nextSnapshotId: string) {
    const opt = options.find((o) => o.snapshotId === nextSnapshotId);
    onChange(nextSnapshotId, opt?.reportDate ?? '');
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs uppercase tracking-wider text-text-secondary" htmlFor={yearId}>
          Year
        </label>
        <select
          id={yearId}
          value={selectedYear ?? ''}
          onChange={(e) => handleYearChange(e.target.value)}
          className={inputClass}
          disabled={empty}
        >
          {empty ? (
            <option value="">—</option>
          ) : (
            yearGroups.map((g) => (
              <option key={g.year} value={g.year}>
                {g.year}
              </option>
            ))
          )}
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-text-secondary" htmlFor={dateId}>
          Report date
        </label>
        <select
          id={dateId}
          value={snapshotId}
          onChange={(e) => handleDateChange(e.target.value)}
          className={inputClass}
          disabled={empty || datesInYear.length === 0}
        >
          {empty || datesInYear.length === 0 ? (
            <option value="">No reports in range</option>
          ) : (
            datesInYear.map((o) => (
              <option key={o.snapshotId} value={o.snapshotId}>
                {formatReportDateLong(o.reportDate)}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
