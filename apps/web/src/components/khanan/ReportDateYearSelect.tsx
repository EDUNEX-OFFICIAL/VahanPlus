'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatReportDateLong,
  groupReportDateOptionsByYear,
  type ReportDateOption,
} from '@/lib/epass-report-date';
import { ALL_REPORTS_SNAPSHOT_ID } from '@/components/khanan/ConsigneeEpassFilters';

interface ReportDateYearSelectProps {
  idPrefix: string;
  options: ReportDateOption[];
  snapshotId: string;
  onChange: (snapshotId: string, reportDate: string) => void;
  inputClass: string;
  allowAllReports?: boolean;
}

export function ReportDateYearSelect({
  idPrefix,
  options,
  snapshotId,
  onChange,
  inputClass,
  allowAllReports = false,
}: ReportDateYearSelectProps) {
  const isAllReports = allowAllReports && snapshotId === ALL_REPORTS_SNAPSHOT_ID;
  const [browseYear, setBrowseYear] = useState<number | null>(null);

  const yearGroups = useMemo(() => groupReportDateOptionsByYear(options), [options]);

  const selectedOption = useMemo(
    () => (isAllReports ? null : (options.find((o) => o.snapshotId === snapshotId) ?? null)),
    [options, snapshotId, isAllReports],
  );

  const selectedYear = useMemo(() => {
    if (isAllReports) return null;
    if (!yearGroups.length) return null;
    const fromSelection = selectedOption
      ? yearGroups.find((g) => g.options.some((o) => o.snapshotId === selectedOption.snapshotId))
          ?.year
      : null;
    return fromSelection ?? yearGroups[0].year;
  }, [yearGroups, selectedOption, isAllReports]);

  useEffect(() => {
    if (!isAllReports || yearGroups.length === 0) return;
    const latestYear = yearGroups[0].year;
    const browseYearValid = browseYear != null && yearGroups.some((g) => g.year === browseYear);
    if (!browseYearValid) {
      setBrowseYear(latestYear);
    }
  }, [isAllReports, yearGroups, browseYear]);

  const activeYear = isAllReports ? browseYear : selectedYear;

  const datesInYear = useMemo(() => {
    if (activeYear == null) return [];
    return yearGroups.find((g) => g.year === activeYear)?.options ?? [];
  }, [yearGroups, activeYear]);

  const yearId = `${idPrefix}-report-year`;
  const dateId = `${idPrefix}-report-date`;
  const empty = options.length === 0 && !allowAllReports;
  const noDatesInRange = options.length === 0 && allowAllReports;

  function handleYearChange(yearValue: string) {
    const year = Number(yearValue);
    const group = yearGroups.find((g) => g.year === year);
    if (!group?.options.length) return;

    if (isAllReports) {
      setBrowseYear(year);
      return;
    }

    const keepCurrent =
      selectedOption && group.options.some((o) => o.snapshotId === selectedOption.snapshotId);
    const next = keepCurrent ? selectedOption : group.options[0];
    onChange(next.snapshotId, next.reportDate);
  }

  function handleDateChange(nextSnapshotId: string) {
    if (nextSnapshotId === ALL_REPORTS_SNAPSHOT_ID) {
      onChange(ALL_REPORTS_SNAPSHOT_ID, '');
      return;
    }
    const opt = options.find((o) => o.snapshotId === nextSnapshotId);
    onChange(nextSnapshotId, opt?.reportDate ?? '');
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted"
            htmlFor={yearId}
          >
            Year
          </label>
          <select
            id={yearId}
            value={activeYear ?? ''}
            onChange={(e) => handleYearChange(e.target.value)}
            className={inputClass}
            disabled={empty || yearGroups.length === 0}
          >
            {empty || yearGroups.length === 0 ? (
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
          <label
            className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted"
            htmlFor={dateId}
          >
            Report date
          </label>
          <select
            id={dateId}
            value={isAllReports ? ALL_REPORTS_SNAPSHOT_ID : snapshotId}
            onChange={(e) => handleDateChange(e.target.value)}
            className={inputClass}
            disabled={!allowAllReports && (empty || datesInYear.length === 0)}
          >
            {allowAllReports ? <option value={ALL_REPORTS_SNAPSHOT_ID}>All reports</option> : null}
            {empty || datesInYear.length === 0 ? (
              !allowAllReports ? (
                <option value="">No reports in range</option>
              ) : null
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
      {noDatesInRange ? (
        <p className="text-xs text-text-secondary/80">No reports in range</p>
      ) : null}
    </div>
  );
}
