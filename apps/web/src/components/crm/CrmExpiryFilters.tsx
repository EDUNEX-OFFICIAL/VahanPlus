'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FilterDropdownPanel,
  FilterSection,
  filterInputClass,
} from '@/components/ui/AdaptiveFilterSheet';
import { Button } from '@/components/ui/Button';
import { buildCrmExpiryFilterChips } from '@/lib/crm-expiry-view';
import type {
  CrmExpiryFilterValues,
  CrmExpiryFoundFilter,
  CrmExpirySourceFilter,
  CrmExpiryStatus,
} from '@/lib/crm-types';

interface CrmExpiryFiltersProps {
  values: CrmExpiryFilterValues;
  onApply: (next: CrmExpiryFilterValues) => void;
  onClear: () => void;
}

export function CrmExpiryFilters({ values, onApply, onClear }: CrmExpiryFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CrmExpiryFilterValues>(values);
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

  const chips = buildCrmExpiryFilterChips(values);

  function patch(partial: Partial<CrmExpiryFilterValues>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  function handleReset() {
    onClear();
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
                title="CRM filters"
                footer={
                  <>
                    <Button variant="secondary" className="text-sm" onClick={handleReset}>
                      Reset
                    </Button>
                    <Button className="text-sm" onClick={handleApply}>
                      Apply
                    </Button>
                  </>
                }
              >
                <div className="space-y-5">
                  <FilterSection title="Vehicle">
                    <input
                      type="search"
                      value={draft.search}
                      onChange={(e) => patch({ search: e.target.value })}
                      placeholder="e.g. BR01GN8970"
                      className={filterInputClass}
                    />
                  </FilterSection>

                  <FilterSection title="Queue">
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { value: 'active' as const, label: 'Active' },
                          { value: 'removed' as const, label: 'Removed' },
                        ] as const
                      ).map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={draft.status === value ? 'primary' : 'secondary'}
                          className="min-h-11 px-4 text-sm"
                          onClick={() => patch({ status: value as CrmExpiryStatus })}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { value: 'all' as const, label: 'All sources' },
                          { value: 'auto' as const, label: 'Auto' },
                          { value: 'manual' as const, label: 'Manual' },
                        ] as const
                      ).map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={draft.source === value ? 'primary' : 'secondary'}
                          className="min-h-11 px-4 text-sm"
                          onClick={() => patch({ source: value as CrmExpirySourceFilter })}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </FilterSection>

                  <FilterSection title="Portal match">
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { value: 'all' as const, label: 'All' },
                          { value: 'found' as const, label: 'Found' },
                          { value: 'notFound' as const, label: 'No data' },
                        ] as const
                      ).map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={draft.found === value ? 'primary' : 'secondary'}
                          className="min-h-11 px-4 text-sm"
                          onClick={() => patch({ found: value as CrmExpiryFoundFilter })}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </FilterSection>

                  <FilterSection title="Expiry alert (days left)">
                    <p className="text-xs leading-relaxed text-text-secondary">
                      Vehicle in queue if <span className="text-white">Insurance</span>,{' '}
                      <span className="text-white">RC tax</span>, or{' '}
                      <span className="text-white">Fitness</span> is within these days (any one
                      match).
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="crm-expiry-insurance-days"
                          className="text-xs uppercase tracking-wider text-text-secondary"
                        >
                          Insurance days left ≤
                        </label>
                        <input
                          id="crm-expiry-insurance-days"
                          type="number"
                          min={0}
                          value={draft.insuranceExpiryDays}
                          onChange={(e) => patch({ insuranceExpiryDays: e.target.value })}
                          className={`${filterInputClass} mt-1`}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="crm-expiry-rc-days"
                          className="text-xs uppercase tracking-wider text-text-secondary"
                        >
                          RC tax days left ≤
                        </label>
                        <input
                          id="crm-expiry-rc-days"
                          type="number"
                          min={0}
                          value={draft.rcExpiryDays}
                          onChange={(e) => patch({ rcExpiryDays: e.target.value })}
                          className={`${filterInputClass} mt-1`}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="crm-expiry-fitness-days"
                          className="text-xs uppercase tracking-wider text-text-secondary"
                        >
                          Fitness days left ≤
                        </label>
                        <input
                          id="crm-expiry-fitness-days"
                          type="number"
                          min={0}
                          value={draft.fitnessExpiryDays}
                          onChange={(e) => patch({ fitnessExpiryDays: e.target.value })}
                          className={`${filterInputClass} mt-1`}
                        />
                      </div>
                    </div>
                  </FilterSection>

                  <FilterSection title="Vehicle metadata">
                    <input
                      type="text"
                      value={draft.vehicleClass}
                      onChange={(e) => patch({ vehicleClass: e.target.value })}
                      placeholder="Vehicle class"
                      className={filterInputClass}
                    />
                    <input
                      type="text"
                      value={draft.esimValidity}
                      onChange={(e) => patch({ esimValidity: e.target.value })}
                      placeholder="eSIM validity"
                      className={filterInputClass}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={draft.grossWeightMin}
                        onChange={(e) => patch({ grossWeightMin: e.target.value })}
                        placeholder="Gross min"
                        className={filterInputClass}
                      />
                      <input
                        type="number"
                        min={0}
                        value={draft.grossWeightMax}
                        onChange={(e) => patch({ grossWeightMax: e.target.value })}
                        placeholder="Gross max"
                        className={filterInputClass}
                      />
                    </div>
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
