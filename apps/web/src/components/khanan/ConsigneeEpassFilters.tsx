'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatMineralLabel } from '@/lib/epass-district-view';
import type { EpassBrowseFilterValues } from '@/lib/epass-filter-params';
import { compareReportDates, snapshotsForDateMode } from '@/lib/epass-report-date';
import { operatorFilterLabel } from '@/lib/operator';
import type { EpassSnapshotListItemDto } from '@/lib/epass-types';

interface ConsigneeEpassFiltersProps {
  snapshots: EpassSnapshotListItemDto[];
  minerals: string[];
  districts: string[];
  values: EpassBrowseFilterValues;
  onApply: (next: EpassBrowseFilterValues) => void;
  onClear: () => void;
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-border-default bg-surface-deep px-3 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20';

function reportDateOptions(
  snapshots: EpassSnapshotListItemDto[],
): { reportDate: string; snapshotId: string }[] {
  const byDate = new Map<string, EpassSnapshotListItemDto>();
  for (const s of snapshots) {
    const existing = byDate.get(s.reportDate);
    if (!existing || new Date(s.scrapedAt) > new Date(existing.scrapedAt)) {
      byDate.set(s.reportDate, s);
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => compareReportDates(b[0], a[0]))
    .map(([reportDate, snap]) => ({ reportDate, snapshotId: snap.id }));
}

export function buildConsigneeFilterChips(values: EpassBrowseFilterValues): string[] {
  const chips: string[] = [operatorFilterLabel(values.operator)];
  if (values.minerals.length > 0) chips.push(formatMineralLabel(values.minerals));
  if (values.dateMode === 'range' && (values.dateFrom || values.dateTo)) {
    const from = values.dateFrom || '…';
    const to = values.dateTo || values.dateFrom || '…';
    chips.push(`${from} – ${to}`);
  }
  if (values.reportDate) chips.push(values.reportDate);
  if (values.districts.length > 0) {
    chips.push(
      values.districts.length === 1
        ? values.districts[0].toUpperCase()
        : `${values.districts.length} districts`,
    );
  }
  if (values.consignerSearch.trim()) chips.push(values.consignerSearch.trim());
  if (values.consigneeSearch.trim()) chips.push(`Consignee: ${values.consigneeSearch.trim()}`);
  if (values.hideZeroPasses) chips.push('No zero passes');
  return chips;
}

export function ConsigneeEpassFilters({
  snapshots,
  minerals,
  districts,
  values,
  onApply,
  onClear,
}: ConsigneeEpassFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EpassBrowseFilterValues>(values);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setDraft(values);
  }, [open, values]);

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

  useEffect(() => {
    if (!open) return;
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
  }, [open, dateOptions, draft.snapshotId]);

  const chips = buildConsigneeFilterChips(values);

  function patch(partial: Partial<EpassBrowseFilterValues>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleApply() {
    let snapshotId = '';
    let reportDate = '';
    if (dateOptions.length > 0) {
      const match =
        dateOptions.find((o) => o.snapshotId === draft.snapshotId) ??
        dateOptions.find((o) => o.reportDate === draft.reportDate) ??
        dateOptions[0];
      snapshotId = match.snapshotId;
      reportDate = match.reportDate;
    }
    onApply({ ...draft, snapshotId, reportDate, consignerRowId: values.consignerRowId });
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
              <Card className="fixed inset-x-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-50 flex max-h-[min(72dvh,calc(100dvh-11rem),640px)] flex-col overflow-y-auto p-4 shadow-2xl md:absolute md:inset-auto md:left-0 md:top-full md:mt-2 md:max-h-[min(78vh,680px)] md:w-[min(100vw-2rem,420px)]">
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
                        htmlFor="consignee-date-from"
                      >
                        From
                      </label>
                      <input
                        id="consignee-date-from"
                        type="date"
                        value={draft.dateFrom}
                        onChange={(e) => patch({ dateFrom: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        className="text-xs uppercase tracking-wider text-text-secondary"
                        htmlFor="consignee-date-to"
                      >
                        To
                      </label>
                      <input
                        id="consignee-date-to"
                        type="date"
                        value={draft.dateTo}
                        onChange={(e) => patch({ dateTo: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label
                    className="text-xs uppercase tracking-wider text-text-secondary"
                    htmlFor="consignee-report-date"
                  >
                    Report date
                  </label>
                  <select
                    id="consignee-report-date"
                    value={draft.snapshotId}
                    onChange={(e) => {
                      const opt = dateOptions.find((o) => o.snapshotId === e.target.value);
                      patch({
                        snapshotId: e.target.value,
                        reportDate: opt?.reportDate ?? '',
                      });
                    }}
                    className={inputClass}
                    disabled={dateOptions.length === 0}
                  >
                    {dateOptions.length === 0 ? (
                      <option value="">No reports in range</option>
                    ) : (
                      dateOptions.map((o) => (
                        <option key={o.snapshotId} value={o.snapshotId}>
                          {o.reportDate}
                        </option>
                      ))
                    )}
                  </select>
                </div>

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
                              className="h-5 w-5 rounded border-border-default"
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
                    htmlFor="consignee-consigner-search"
                  >
                    Consigner
                  </label>
                  <input
                    id="consignee-consigner-search"
                    type="search"
                    value={draft.consignerSearch}
                    onChange={(e) => patch({ consignerSearch: e.target.value })}
                    placeholder="Search by name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    className="text-xs uppercase tracking-wider text-text-secondary"
                    htmlFor="consignee-name-search"
                  >
                    Consignee
                  </label>
                  <input
                    id="consignee-name-search"
                    type="search"
                    value={draft.consigneeSearch}
                    onChange={(e) => patch({ consigneeSearch: e.target.value })}
                    placeholder="Filter table rows"
                    className={inputClass}
                  />
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

                <div className="sticky bottom-0 -mx-4 mt-auto grid grid-cols-2 gap-3 border-t border-border-default bg-surface-primary/95 px-4 pt-3">
                  <Button className="text-sm" onClick={handleApply}>
                    Apply
                  </Button>
                  <Button variant="secondary" className="text-sm" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
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
