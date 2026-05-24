'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ConsignerOptionDto } from '@/lib/epass-types';

export function formatConsignerOption(o: ConsignerOptionDto): string {
  const op = o.operatorType ?? o.role ?? 'lessee';
  return `${o.dmoName} · ${op} · ${o.consignerName} (${o.challanCount})`;
}

function filterOptions(options: ConsignerOptionDto[], query: string): ConsignerOptionDto[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      o.consignerName.toLowerCase().includes(q) ||
      o.dmoName.toLowerCase().includes(q) ||
      (o.operatorType ?? o.role ?? '').toLowerCase().includes(q),
  );
}

interface ConsignerComboboxProps {
  options: ConsignerOptionDto[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

const fieldClass =
  'h-12 w-full rounded-xl border border-border-default bg-surface-deep px-4 pr-10 text-sm text-slate-200 outline-none placeholder:text-text-secondary/60 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-50';

export function ConsignerCombobox({
  options,
  value,
  onChange,
  loading = false,
  disabled = false,
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
    <div ref={rootRef} className="relative">
      <label className="block space-y-2" htmlFor={`${listId}-input`}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          Consigner
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
            placeholder={loading ? 'Loading consigners…' : 'Search or select consigner…'}
            value={displayValue}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className={`${fieldClass} truncate`}
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
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border-default bg-surface-primary py-1 shadow-xl"
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
