'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FilterDropdownPanel,
  FilterSection,
  filterInputClass,
} from '@/components/ui/AdaptiveFilterSheet';
import { Button } from '@/components/ui/Button';
import { buildVehicleStatusFilterChips } from '@/lib/epass-vehicle-status-view';
import type { VehicleStatusFilterValues, VehicleStatusFoundFilter } from '@/lib/epass-types';

interface VehicleStatusFiltersProps {
  values: VehicleStatusFilterValues;
  onApply: (next: VehicleStatusFilterValues) => void;
  onClear: () => void;
}

export function VehicleStatusFilters({ values, onApply, onClear }: VehicleStatusFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VehicleStatusFilterValues>(values);
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

  const chips = buildVehicleStatusFilterChips(values);

  function patch(partial: Partial<VehicleStatusFilterValues>) {
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
                title="Vehicle filters"
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
                    <label
                      className="text-xs uppercase tracking-wider text-text-secondary"
                      htmlFor="vehicle-status-search"
                    >
                      Vehicle / KS reg no
                    </label>
                    <input
                      id="vehicle-status-search"
                      type="search"
                      value={draft.search}
                      onChange={(e) => patch({ search: e.target.value })}
                      placeholder="e.g. BR01GN8970"
                      className={filterInputClass}
                    />
                  </FilterSection>

                  <FilterSection title="Portal match">
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { value: 'all' as const, label: 'All' },
                          { value: 'found' as const, label: 'Found' },
                          { value: 'notFound' as const, label: 'No data on portal' },
                        ] as const
                      ).map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={draft.found === value ? 'primary' : 'secondary'}
                          className="min-h-11 px-4 text-sm"
                          onClick={() => patch({ found: value as VehicleStatusFoundFilter })}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </FilterSection>

                  <FilterSection title="Expiry windows (days)">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={draft.insuranceExpiryDays}
                        onChange={(e) => patch({ insuranceExpiryDays: e.target.value })}
                        placeholder="Insurance"
                        className={filterInputClass}
                      />
                      <input
                        type="number"
                        min={0}
                        value={draft.rcExpiryDays}
                        onChange={(e) => patch({ rcExpiryDays: e.target.value })}
                        placeholder="RC"
                        className={filterInputClass}
                      />
                      <input
                        type="number"
                        min={0}
                        value={draft.fitnessExpiryDays}
                        onChange={(e) => patch({ fitnessExpiryDays: e.target.value })}
                        placeholder="Fitness"
                        className={filterInputClass}
                      />
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
                        placeholder="Gross WT min"
                        className={filterInputClass}
                      />
                      <input
                        type="number"
                        min={0}
                        value={draft.grossWeightMax}
                        onChange={(e) => patch({ grossWeightMax: e.target.value })}
                        placeholder="Gross WT max"
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
