'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FilterDropdownPanel } from '@/components/ui/AdaptiveFilterSheet';
import { Button } from '@/components/ui/Button';
import { ALL_REPORTS_SNAPSHOT_ID } from '@/components/khanan/ConsigneeEpassFilters';
import { ReportDateYearSelect } from '@/components/khanan/ReportDateYearSelect';
import {
  formatReportDateNumeric,
  reportDateOptions,
  snapshotsForDateMode,
} from '@/lib/epass-report-date';
import { formatMineralLabel } from '@/lib/epass-district-view';
import type { DistrictOperatorFilter, EpassSnapshotReportDateItemDto } from '@/lib/epass-types';

export type DistrictDateMode = 'specific' | 'range';

export interface DistrictFilterDraft {
  operator: DistrictOperatorFilter;
  minerals: string[];
  dateMode: DistrictDateMode;
  dateFrom: string;
  dateTo: string;
  reportDate: string;
  snapshotId: string;
  reportScope: 'all' | 'specific';
  districts: string[];
  hideZeroPasses: boolean;
}

export type DistrictFilterValues = DistrictFilterDraft;

interface DistrictEpassFiltersProps {
  snapshots: EpassSnapshotReportDateItemDto[];
  minerals: string[];
  districts: string[];
  values: DistrictFilterValues;
  onApply: (next: DistrictFilterValues) => void;
  onClear: () => void;
  allowAllReports?: boolean;
  reportScope?: 'all' | 'specific';
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-border-default bg-surface-deep px-3 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20';

function operatorLabel(op: DistrictOperatorFilter): string {
  if (op === 'lessee') return 'Lessee';
  if (op === 'dealer') return 'Dealer';
  return 'All';
}

export function buildFilterChips(values: DistrictFilterValues): string[] {
  const chips: string[] = [operatorLabel(values.operator)];
  if (values.minerals.length > 0) chips.push(formatMineralLabel(values.minerals));
  if (values.dateMode === 'range' && (values.dateFrom || values.dateTo)) {
    const from = values.dateFrom ? formatReportDateNumeric(values.dateFrom) : '…';
    const to = values.dateTo
      ? formatReportDateNumeric(values.dateTo)
      : values.dateFrom
        ? formatReportDateNumeric(values.dateFrom)
        : '…';
    chips.push(`${from} – ${to}`);
  }
  if (values.reportScope === 'all') {
    chips.push('All reports');
  } else if (values.reportDate) {
    chips.push(formatReportDateNumeric(values.reportDate));
  }
  if (values.districts.length > 0) {
    chips.push(
      values.districts.length === 1
        ? values.districts[0].toUpperCase()
        : `${values.districts.length} districts`,
    );
  }
  if (values.hideZeroPasses) chips.push('No zero passes');
  return chips;
}

export function DistrictEpassFilters({
  snapshots,
  minerals,
  districts,
  values,
  onApply,
  onClear,
  allowAllReports = true,
  reportScope = 'specific',
}: DistrictEpassFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DistrictFilterDraft>(() => ({
    ...values,
    reportScope: values.reportScope ?? reportScope,
  }));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setDraft({ ...values, reportScope: values.reportScope ?? reportScope });
  }, [open, values, reportScope]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const filteredSnapshots = useMemo(
    () => snapshotsForDateMode(snapshots, draft.dateMode, draft.dateFrom, draft.dateTo),
    [snapshots, draft.dateMode, draft.dateFrom, draft.dateTo],
  );

  const dateOptions = useMemo(() => reportDateOptions(filteredSnapshots), [filteredSnapshots]);

  const effectiveSnapshotId =
    draft.reportScope === 'all' ? ALL_REPORTS_SNAPSHOT_ID : draft.snapshotId;

  useEffect(() => {
    if (!open) return;
    if (draft.reportScope === 'all') return;
    if (dateOptions.length === 0) {
      setDraft((d) => ({ ...d, reportDate: '', snapshotId: '' }));
      return;
    }
    const stillValid = dateOptions.some((o) => o.snapshotId === draft.snapshotId);
    if (!stillValid) {
      const first = dateOptions[0];
      setDraft((d) => ({
        ...d,
        reportDate: first.reportDate,
        snapshotId: first.snapshotId,
      }));
    }
  }, [open, dateOptions, draft.snapshotId, draft.reportScope]);

  const chips = buildFilterChips(values);
  const activeCount = chips.length;

  function patch(partial: Partial<DistrictFilterDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleApply() {
    let snapshotId = '';
    let reportDate = '';
    let nextReportScope = draft.reportScope;

    if (draft.reportScope === 'all') {
      snapshotId = '';
      reportDate = '';
    } else if (draft.dateMode === 'range') {
      snapshotId = '';
      reportDate = '';
      nextReportScope = 'specific';
    } else if (dateOptions.length > 0) {
      const match =
        dateOptions.find((o) => o.snapshotId === draft.snapshotId) ??
        dateOptions.find((o) => o.reportDate === draft.reportDate) ??
        dateOptions[0];
      snapshotId = match.snapshotId;
      reportDate = match.reportDate;
      nextReportScope = 'specific';
    }

    onApply({ ...draft, snapshotId, reportDate, reportScope: nextReportScope });
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className={open ? 'relative z-50' : 'relative z-20'} ref={panelRef}>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 gap-2 px-4 text-sm"
            onClick={() => setOpen(true)}
            aria-expanded={open}
          >
            Filter
            {activeCount > 0 ? (
              <span className="rounded-full bg-indigo-500/30 px-1.5 py-0.5 text-[10px] tabular-nums">
                {chips.length}
              </span>
            ) : null}
          </Button>

          {open ? (
            <>
              <button
                type="button"
                aria-label="Close filters"
                className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden"
                onClick={() => setOpen(false)}
              />
              <FilterDropdownPanel
                footer={
                  <>
                    <Button className="text-sm" onClick={handleApply}>
                      Apply
                    </Button>
                    <Button variant="secondary" className="text-sm" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                  </>
                }
              >
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-secondary">Operator</p>
                    <div className="mt-2 flex gap-2">
                      {(
                        [
                          { value: 'all' as const, label: 'All' },
                          { value: 'lessee' as const, label: 'Lessee' },
                          { value: 'dealer' as const, label: 'Dealer' },
                        ] as const
                      ).map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={draft.operator === value ? 'primary' : 'secondary'}
                          className="min-h-11 px-4 text-sm"
                          onClick={() => patch({ operator: value })}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-secondary">Mineral</p>
                    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border-default bg-surface-deep p-3">
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary">
                        <input
                          type="checkbox"
                          checked={draft.minerals.length === 0}
                          onChange={() => patch({ minerals: [] })}
                          className="h-5 w-5 rounded border-border-default"
                        />
                        All
                      </label>
                      {minerals.map((m) => {
                        const checked = draft.minerals.some(
                          (x) => x.toLowerCase() === m.toLowerCase(),
                        );
                        return (
                          <label
                            key={m}
                            className="flex cursor-pointer items-center gap-2 text-sm text-white"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  patch({
                                    minerals: draft.minerals.filter(
                                      (x) => x.toLowerCase() !== m.toLowerCase(),
                                    ),
                                  });
                                } else {
                                  patch({ minerals: [...draft.minerals, m] });
                                }
                              }}
                              className="h-5 w-5 rounded border-border-default"
                            />
                            {m}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-secondary">Date</p>
                    <div className="mt-2 flex gap-2">
                      {(
                        [
                          { value: 'specific' as const, label: 'Specific' },
                          { value: 'range' as const, label: 'Range' },
                        ] as const
                      ).map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={draft.dateMode === value ? 'primary' : 'secondary'}
                          className="min-h-11 px-4 text-sm"
                          onClick={() => patch({ dateMode: value })}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {draft.dateMode === 'range' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="text-xs uppercase tracking-wider text-text-secondary"
                          htmlFor="date-from"
                        >
                          From
                        </label>
                        <input
                          id="date-from"
                          type="date"
                          value={draft.dateFrom}
                          onChange={(e) => patch({ dateFrom: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label
                          className="text-xs uppercase tracking-wider text-text-secondary"
                          htmlFor="date-to"
                        >
                          To
                        </label>
                        <input
                          id="date-to"
                          type="date"
                          value={draft.dateTo}
                          onChange={(e) => patch({ dateTo: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ) : null}

                  {draft.dateMode !== 'range' || draft.reportScope === 'all' ? (
                    <ReportDateYearSelect
                      idPrefix="district"
                      options={dateOptions}
                      snapshotId={effectiveSnapshotId}
                      allowAllReports={allowAllReports}
                      onChange={(snapshotId, reportDate) => {
                        if (snapshotId === ALL_REPORTS_SNAPSHOT_ID) {
                          patch({ reportScope: 'all', snapshotId: '', reportDate: '' });
                        } else {
                          patch({
                            reportScope: 'specific',
                            snapshotId,
                            reportDate,
                          });
                        }
                      }}
                      inputClass={inputClass}
                    />
                  ) : null}

                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-secondary">District</p>
                    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border-default bg-surface-deep p-3">
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary">
                        <input
                          type="checkbox"
                          checked={draft.districts.length === 0}
                          onChange={() => patch({ districts: [] })}
                          className="h-5 w-5 rounded border-border-default"
                        />
                        All
                      </label>
                      {districts.length === 0 ? (
                        <p className="text-xs text-text-secondary/80">
                          No districts for this report
                        </p>
                      ) : (
                        districts.map((d) => {
                          const checked = draft.districts.some(
                            (x) => x.toLowerCase() === d.toLowerCase(),
                          );
                          return (
                            <label
                              key={d}
                              className="flex cursor-pointer items-center gap-2 text-sm text-white"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    patch({
                                      districts: draft.districts.filter(
                                        (x) => x.toLowerCase() !== d.toLowerCase(),
                                      ),
                                    });
                                  } else {
                                    patch({ districts: [...draft.districts, d] });
                                  }
                                }}
                                className="h-5 w-5 rounded border-border-default"
                              />
                              {d}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={draft.hideZeroPasses}
                      onChange={(e) => patch({ hideZeroPasses: e.target.checked })}
                      className="h-5 w-5 rounded border-border-default"
                    />
                    Hide zero passes
                  </label>
                </div>
              </FilterDropdownPanel>
            </>
          ) : null}
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip, i) => (
              <span
                key={`${chip}-${i}`}
                className="rounded-lg border border-border-default bg-surface-deep px-2.5 py-1 text-xs text-text-secondary"
              >
                {chip}
              </span>
            ))}
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
