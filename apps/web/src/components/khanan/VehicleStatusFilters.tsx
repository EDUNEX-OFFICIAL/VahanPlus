'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { buildVehicleStatusFilterChips } from '@/lib/epass-vehicle-status-view';
import type { VehicleStatusFilterValues, VehicleStatusFoundFilter } from '@/lib/epass-types';

interface VehicleStatusFiltersProps {
  values: VehicleStatusFilterValues;
  onApply: (next: VehicleStatusFilterValues) => void;
  onClear: () => void;
}

const inputClass =
  'mt-2 w-full rounded-lg border border-border-default bg-surface-deep px-3 py-2 text-sm text-white';

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative" ref={panelRef}>
          <Button
            variant="secondary"
            className="min-h-9 gap-2 px-3 text-xs"
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
            <Card className="absolute left-0 top-full z-30 mt-2 w-[min(100vw-2rem,380px)] space-y-4 p-4 shadow-xl">
              <div>
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
                  className={inputClass}
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-text-secondary">Portal match</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      { value: 'all' as const, label: 'All' },
                      { value: 'found' as const, label: 'Found' },
                      { value: 'notFound' as const, label: 'Not found' },
                    ] as const
                  ).map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={draft.found === value ? 'primary' : 'secondary'}
                      className="min-h-8 px-3 py-1 text-xs"
                      onClick={() => patch({ found: value as VehicleStatusFoundFilter })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 border-t border-border-default pt-3">
                <Button className="flex-1 text-xs" onClick={handleApply}>
                  Apply
                </Button>
                <Button variant="secondary" className="text-xs" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
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
