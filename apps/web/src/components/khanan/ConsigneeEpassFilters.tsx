'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  FilterDropdownPanel,
  FilterSection,
  filterCheckClass,
  filterInputClass,
} from '@/components/ui/AdaptiveFilterSheet';
import { formatMineralLabel } from '@/lib/epass-district-view';
import type { EpassBrowseFilterValues } from '@/lib/epass-filter-params';
import { ReportDateYearSelect } from '@/components/khanan/ReportDateYearSelect';
import {
  formatReportDateNumeric,
  isValidRangeSelection,
  normalizeDateRange,
  reportDateOptions,
  snapshotsForDateMode,
} from '@/lib/epass-report-date';
import { mcvPortalStatusLabel } from '@/lib/mcv-portal-status';
import { operatorFilterLabel } from '@/lib/operator';
import type { EpassSnapshotReportDateItemDto, McvPortalStatus } from '@/lib/epass-types';

export const ALL_REPORTS_SNAPSHOT_ID = 'all';

interface ConsigneeEpassFiltersProps {
  snapshots: EpassSnapshotReportDateItemDto[];
  minerals: string[];
  districts: string[];
  values: EpassBrowseFilterValues;
  onApply: (next: EpassBrowseFilterValues, extras?: ConsigneeEpassFilterExtras) => void;
  onClear: () => void;
  /** Show challan number search (Chalaan page only). */
  showChallanSearch?: boolean;
  /** Show destination search (Chalaan + Consignee; pass-level field). */
  showDestinationSearch?: boolean;
  /** Vehicle Data: allow "All reports" in date selector. */
  allowAllReports?: boolean;
  reportScope?: 'all' | 'specific';
  /** Vehicle Data: portal status filter section. */
  showPortalStatusFilter?: boolean;
  portalStatus?: McvPortalStatus | 'all';
}

export interface ConsigneeEpassFilterExtras {
  reportScope?: 'all' | 'specific';
  portalStatus?: McvPortalStatus | 'all';
}

type DraftState = EpassBrowseFilterValues & {
  reportScope: 'all' | 'specific';
  portalStatus: McvPortalStatus | 'all';
};

const PORTAL_STATUS_OPTIONS: Array<{ value: McvPortalStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'on_portal', label: 'On portal' },
  { value: 'not_checked', label: 'Not checked' },
  { value: 'no_portal_data', label: 'No data' },
];

export function buildConsigneeFilterChips(
  values: EpassBrowseFilterValues,
  extras?: ConsigneeEpassFilterExtras,
): string[] {
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
  if (extras?.reportScope === 'all') {
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
  if (values.consigneeSearch.trim()) chips.push(`Consignee: ${values.consigneeSearch.trim()}`);
  if (values.destination.trim()) chips.push(`Destination: ${values.destination.trim()}`);
  if (values.challanSearch.trim()) chips.push(`Chalaan: ${values.challanSearch.trim()}`);
  if (values.hideZeroPasses) chips.push('No zero passes');
  if (extras?.portalStatus && extras.portalStatus !== 'all') {
    chips.push(`Portal: ${mcvPortalStatusLabel(extras.portalStatus)}`);
  }
  return chips;
}

export function ConsigneeEpassFilters({
  snapshots,
  minerals,
  districts,
  values,
  onApply,
  onClear,
  showChallanSearch = false,
  showDestinationSearch = false,
  allowAllReports = false,
  reportScope = 'specific',
  showPortalStatusFilter = false,
  portalStatus = 'all',
}: ConsigneeEpassFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => ({
    ...values,
    reportScope,
    portalStatus,
  }));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setDraft({ ...values, reportScope, portalStatus });
    }
  }, [open, values, reportScope, portalStatus]);

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

  const chips = buildConsigneeFilterChips(values, { reportScope, portalStatus });

  function patch(partial: Partial<DraftState>) {
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

    onApply(
      {
        ...draft,
        ...normalizedDates,
        snapshotId,
        reportDate,
        consignerRowId: values.consignerRowId,
      },
      {
        reportScope: nextReportScope,
        portalStatus: showPortalStatusFilter ? draft.portalStatus : undefined,
      },
    );
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
            {chips.length > 0 ? (
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
                  <FilterSection title="Operator">
                    <div className="flex flex-wrap gap-2">
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
                  </FilterSection>

                  <FilterSection title="Mineral">
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border-default bg-surface-deep p-3">
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary">
                        <input
                          type="checkbox"
                          checked={draft.minerals.length === 0}
                          onChange={() => patch({ minerals: [] })}
                          className={filterCheckClass}
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
                              className={filterCheckClass}
                            />
                            {m}
                          </label>
                        );
                      })}
                    </div>
                  </FilterSection>

                  <FilterSection title="Date">
                    <div className="flex flex-wrap gap-2">
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
                  </FilterSection>

                  {draft.dateMode === 'range' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted"
                          htmlFor="consignee-date-from"
                        >
                          From
                        </label>
                        <input
                          id="consignee-date-from"
                          type="date"
                          value={draft.dateFrom}
                          onChange={(e) => patch({ dateFrom: e.target.value })}
                          className={filterInputClass}
                        />
                      </div>
                      <div>
                        <label
                          className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted"
                          htmlFor="consignee-date-to"
                        >
                          To
                        </label>
                        <input
                          id="consignee-date-to"
                          type="date"
                          value={draft.dateTo}
                          onChange={(e) => patch({ dateTo: e.target.value })}
                          className={filterInputClass}
                        />
                      </div>
                    </div>
                  ) : null}

                  {draft.dateMode !== 'range' || draft.reportScope === 'all' ? (
                    <ReportDateYearSelect
                      idPrefix="consignee"
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
                      inputClass={filterInputClass}
                    />
                  ) : null}

                  <FilterSection title="District">
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border-default bg-surface-deep p-3">
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
                                className={filterCheckClass}
                              />
                              {d}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </FilterSection>

                  {showChallanSearch ? (
                    <FilterSection title="Chalaan">
                      <input
                        id="chalaan-number-search"
                        type="search"
                        value={draft.challanSearch}
                        onChange={(e) => patch({ challanSearch: e.target.value })}
                        placeholder="Challan number"
                        className={filterInputClass}
                      />
                    </FilterSection>
                  ) : null}

                  <FilterSection title="Consigner">
                    <input
                      id="consignee-consigner-search"
                      type="search"
                      value={draft.consignerSearch}
                      onChange={(e) => patch({ consignerSearch: e.target.value })}
                      placeholder="Search by name"
                      className={filterInputClass}
                    />
                  </FilterSection>

                  {showDestinationSearch ? (
                    <FilterSection title="Destination">
                      <input
                        id="consignee-destination-search"
                        type="search"
                        value={draft.destination}
                        onChange={(e) => patch({ destination: e.target.value })}
                        placeholder="Search destination"
                        className={filterInputClass}
                      />
                    </FilterSection>
                  ) : null}

                  <FilterSection title="Consignee">
                    <input
                      id="consignee-name-search"
                      type="search"
                      value={draft.consigneeSearch}
                      onChange={(e) => patch({ consigneeSearch: e.target.value })}
                      placeholder="Filter table rows"
                      className={filterInputClass}
                    />
                  </FilterSection>

                  {showPortalStatusFilter ? (
                    <FilterSection title="Portal status">
                      <div className="flex flex-wrap gap-2">
                        {PORTAL_STATUS_OPTIONS.map(({ value, label }) => (
                          <Button
                            key={value}
                            variant={draft.portalStatus === value ? 'primary' : 'secondary'}
                            className="min-h-11 px-3 text-sm"
                            onClick={() => patch({ portalStatus: value })}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </FilterSection>
                  ) : null}

                  <FilterSection title="Options">
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={draft.hideZeroPasses}
                        onChange={(e) => patch({ hideZeroPasses: e.target.checked })}
                        className={filterCheckClass}
                      />
                      Hide zero passes
                    </label>
                  </FilterSection>
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
