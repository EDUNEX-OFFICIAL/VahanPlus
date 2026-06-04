'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface GhatStatusCellProps {
  consignerRowId: string;
  ghatNumber: string | null;
  editable: boolean;
  onSave: (consignerRowId: string, ghatNumber: string) => Promise<void> | void;
}

export function GhatStatusCell({
  consignerRowId,
  ghatNumber,
  editable,
  onSave,
}: GhatStatusCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ghatNumber ?? '');
  const [display, setDisplay] = useState(ghatNumber ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(ghatNumber ?? '');
    setDisplay(ghatNumber ?? '');
  }, [ghatNumber]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = useCallback(async () => {
    const next = draft.trim();
    const prev = display.trim();
    setEditing(false);
    if (next === prev) return;

    setSaving(true);
    const rollback = display;
    setDisplay(next);
    try {
      await onSave(consignerRowId, next);
    } catch {
      setDisplay(rollback);
      setDraft(rollback);
    } finally {
      setSaving(false);
    }
  }, [draft, display, consignerRowId, onSave]);

  if (!editable) {
    return <span className="text-text-secondary">{display.trim() || '—'}</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={64}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit();
          if (e.key === 'Escape') {
            setDraft(display);
            setEditing(false);
          }
        }}
        className={cn(
          'w-full min-w-[6rem] rounded-lg border border-indigo-500/40 bg-surface-deep px-2 py-1 text-sm text-white',
          saving && 'opacity-60',
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group inline-flex min-w-[4rem] items-center gap-1 rounded-lg border border-transparent px-1 py-0.5 text-left text-sm text-white hover:border-indigo-500/30 hover:bg-indigo-500/10"
    >
      <span>{display.trim() || '—'}</span>
      <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100">edit</span>
    </button>
  );
}
