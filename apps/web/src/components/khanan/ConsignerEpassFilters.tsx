'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FilterDropdownPanel, filterCheckClass } from '@/components/ui/AdaptiveFilterSheet';
import { Button } from '@/components/ui/Button';
import { formatMineralLabel } from '@/lib/epass-district-view';
import { ALL_REPORTS_SNAPSHOT_ID } from '@/components/khanan/ConsigneeEpassFilters';
import { ReportDateYearSelect } from '@/components/khanan/ReportDateYearSelect';
import {
  formatReportDateNumeric,
  isValidRangeSelection,
  normalizeDateRange,
  reportDateOptions,
  snapshotsForDateMode,
} from '@/lib/epass-report-date';
import { operatorFilterLabel } from '@/lib/operator';
import type { EpassBrowseFilterValues, EpassSnapshotReportDateItemDto } from '@/lib/epass-types';

export type ConsignerDateMode = 'specific' | 'range';

export type ConsignerFilterValues = EpassBrowseFilterValues;

interface ConsignerEpassFiltersProps {
  snapshots: EpassSnapshotReportDateItemDto[];
  minerals: string[];
  districts: string[];
  values: EpassBrowseFilterValues;
  onApply: (next: EpassBrowseFilterValues) => void;
  onClear: () => void;
  allowAllReports?: boolean;
  reportScope?: 'all' | 'specific';
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-border-default bg-surface-deep px-3 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20';

export function buildConsignerFilterChips(values: EpassBrowseFilterValues): string[] {
  const chips: string[] = [operatorFilterLabel(values.operator)];
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
  } else if (values.reportDate && values.dateMode !== 'range') {
    chips.push(formatReportDateNumeric(values.reportDate));
  }
  if (values.districts.length > 0) {
    chips.push(
      values.districts.length === 1
        ? values.districts[0].toUpperCase()
        : `${values.districts.length} districts`,
    );
  }
  if (values.consignerSearch.trim()) chips.push(values.consignerSearch.trim());
  if (values.hideZeroChallans) chips.push('No zero challans');
  return chips;
}

export function ConsignerEpassFilters({
  snapshots,
  minerals,
  districts,
  values,
  onApply,
  onClear,
  allowAllReports = true,
  reportScope = 'specific',
}: ConsignerEpassFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EpassBrowseFilterValues>(() => ({
    ...values,
    reportScope: values.reportScope ?? reportScope,
  }));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setDraft({ ...values, reportScope: values.reportScope ?? reportScope });
  }, [open, values, reportScope]);

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

  const chips = buildConsignerFilterChips(values);

  function patch(partial: Partial<EpassBrowseFilterValues>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  const rangeDatesValid = isValidRangeSelection(draft.dateMode, draft.dateFrom, draft.dateTo);

  function handleApply() {
    if (!rangeDatesValid) return;

    const normalizedDates = normalizeDateRange(draft.dateFrom, draft.dateTo);
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

    onApply({ ...draft, ...normalizedDates, snapshotId, reportDate, reportScope: nextReportScope });
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
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Filter
            {chips.length > 0 ? (
              <span className="rounded-full bg-indigo-500/30 px-1.5 py-0.5 text-[10px] tabular-nums">
                {chips.length}
              </span>
            ) : null}
          </Button>

          {open ? (
            <FilterDropdownPanel
              open={open}
              anchorRef={panelRef}
              title="Filters"
              onClose={() => setOpen(false)}
              footer={
                <>
                  <Button className="text-sm" onClick={handleApply} disabled={!rangeDatesValid}>
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
                        className={filterCheckClass}
                      />
                      All
                    </label>
                    {minerals.length === 0 ? (
                      <p className="text-xs text-text-secondary/80">No minerals for this scope</p>
                    ) : null}
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
                            className={filterCheckClass}
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
                        onClick={() =>
                          patch({
                            dateMode: value,
                            ...(value === 'range'
                              ? { snapshotId: '', reportDate: '', reportScope: 'specific' }
                              : {}),
                          })
                        }
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
                        htmlFor="consigner-date-from"
                      >
                        From
                      </label>
                      <input
                        id="consigner-date-from"
                        type="date"
                        value={draft.dateFrom}
                        onChange={(e) => patch({ dateFrom: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        className="text-xs uppercase tracking-wider text-text-secondary"
                        htmlFor="consigner-date-to"
                      >
                        To
                      </label>
                      <input
                        id="consigner-date-to"
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
                    idPrefix="consigner"
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
                        className={filterCheckClass}
                      />
                      All
                    </label>
                    {districts.length === 0 ? (
                      <p className="text-xs text-text-secondary/80">No districts for this report</p>
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
                              className={filterCheckClass}
                            />
                            {d}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label
                    className="text-xs uppercase tracking-wider text-text-secondary"
                    htmlFor="consigner-name-search"
                  >
                    Consigner
                  </label>
                  <input
                    id="consigner-name-search"
                    type="search"
                    value={draft.consignerSearch}
                    onChange={(e) => patch({ consignerSearch: e.target.value })}
                    placeholder="Search by name"
                    className={inputClass}
                  />
                </div>

                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={draft.hideZeroChallans}
                    onChange={(e) => patch({ hideZeroChallans: e.target.checked })}
                    className={filterCheckClass}
                  />
                  Hide zero challans
                </label>
              </div>
            </FilterDropdownPanel>
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
