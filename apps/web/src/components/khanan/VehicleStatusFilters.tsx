'use client';

import { useEffect, useState } from 'react';
import {
  AdaptiveFilterSheet,
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

  useEffect(() => {
    if (!open) setDraft(values);
  }, [open, values]);

  const chips = buildVehicleStatusFilterChips(values);

  function patch(partial: Partial<VehicleStatusFilterValues>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  return (
    <AdaptiveFilterSheet
      open={open}
      onOpenChange={setOpen}
      title="Vehicle filters"
      count={chips.length}
      chips={chips}
      onApply={handleApply}
      onReset={() => {
        onClear();
        setOpen(false);
      }}
    >
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
              { value: 'notFound' as const, label: 'Not found' },
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
    </AdaptiveFilterSheet>
  );
}
