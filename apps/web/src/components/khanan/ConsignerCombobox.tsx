'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ConsignerOptionDto } from '@/lib/epass-types';
import { appendGhatSuffix } from '@/lib/consigner-display';

export function formatConsignerOption(o: ConsignerOptionDto): string {
  const op = o.operatorType ?? o.role ?? 'lessee';
  const count =
    o.challanCount != null && Number.isFinite(o.challanCount) ? ` (${o.challanCount})` : '';
  const base = `${o.dmoName} · ${op} · ${o.consignerName}${count}`;
  return appendGhatSuffix(base, o.ghatNumber);
}

function filterOptions(options: ConsignerOptionDto[], query: string): ConsignerOptionDto[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      o.consignerName.toLowerCase().includes(q) ||
      o.dmoName.toLowerCase().includes(q) ||
      (o.operatorType ?? o.role ?? '').toLowerCase().includes(q) ||
      (o.ghatNumber ?? '').toLowerCase().includes(q),
  );
}

interface ConsignerComboboxProps {
  options: ConsignerOptionDto[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
  refetching?: boolean;
  disabled?: boolean;
  total?: number;
  truncated?: boolean;
  /** Highlights picker when consigners exist but none is selected yet. */
  awaitingSelection?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const fieldClass =
  'h-12 w-full rounded-xl border border-border-default bg-surface-deep px-4 pr-10 text-sm text-slate-200 outline-none placeholder:text-text-secondary/60 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-50';

export function ConsignerCombobox({
  options,
  value,
  onChange,
  loading = false,
  refetching = false,
  disabled = false,
  total,
  truncated = false,
  awaitingSelection = false,
  onOpenChange,
}: ConsignerComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlightIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, filtered.length]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const displayValue = open ? query : selected ? formatConsignerOption(selected) : '';

  const showAwaitingHint =
    awaitingSelection && !value && !loading && !refetching && options.length > 0;
  const availableCount = total ?? options.length;
  const capCount = truncated ? (total ?? options.length) : availableCount;
  const availabilityLabel = loading
    ? 'Loading…'
    : refetching
      ? 'Updating…'
      : truncated
        ? `${capCount}+ available`
        : `${availableCount} available`;
  const inputPlaceholder = loading
    ? 'Loading consigners…'
    : refetching
      ? 'Updating consigners…'
      : showAwaitingHint
        ? 'Select consigner…'
        : 'Search or select consigner…';

  const selectOption = useCallback(
    (o: ConsignerOptionDto) => {
      onChange(o.id);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    },
    [onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (filtered.length > 0) {
        setHighlightIndex((i) => (i + 1) % filtered.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        setHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length);
      }
      return;
    }
    if (e.key === 'Enter' && open && filtered.length > 0) {
      e.preventDefault();
      selectOption(filtered[highlightIndex]);
      return;
    }
    if (e.key === 'Backspace' && open && query === '' && value) {
      onChange('');
    }
  }

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-[60]' : ''}`}>
      <label className="block space-y-2" htmlFor={`${listId}-input`}>
        <span className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            Consigner
          </span>
          {showAwaitingHint || loading || refetching ? (
            <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-200">
              {availabilityLabel}
            </span>
          ) : null}
        </span>
        <div className="relative">
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled || loading}
            placeholder={inputPlaceholder}
            value={displayValue}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className={`${fieldClass} truncate ${showAwaitingHint ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : ''} ${refetching ? 'opacity-70' : ''}`}
          />
          {value && !loading && !disabled ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear consigner"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-slate-200"
              onClick={() => {
                onChange('');
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <span className="text-lg leading-none">×</span>
            </button>
          ) : null}
        </div>
      </label>

      {open && !loading && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[70] mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border-default bg-surface-primary py-1 shadow-2xl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-secondary">No matching consigners</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === highlightIndex
                    ? 'bg-indigo-500/20 text-white'
                    : o.id === value
                      ? 'bg-surface-deep text-indigo-200'
                      : 'text-slate-200 hover:bg-surface-deep'
                }`}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(o);
                }}
              >
                {formatConsignerOption(o)}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
