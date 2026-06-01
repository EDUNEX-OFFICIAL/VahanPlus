'use client';

import { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';

export function AdaptiveFilterSheet({
  open,
  onOpenChange,
  title = 'Filters',
  count = 0,
  chips = [],
  children,
  onApply,
  onReset,
  applyLabel = 'Apply',
  resetLabel = 'Reset',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  count?: number;
  chips?: string[];
  children: ReactNode;
  onApply: () => void;
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(true)}
            aria-expanded={open}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600/50 bg-slate-700/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filter
            {count > 0 ? (
              <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-[11px] tabular-nums">
                {count}
              </span>
            ) : null}
          </button>
          {chips.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {chips.map((chip, i) => (
                <Chip key={`${chip}-${i}`}>{chip}</Chip>
              ))}
              <button
                type="button"
                onClick={onReset}
                className="min-h-9 rounded-full px-2 text-xs font-semibold text-indigo-300 transition hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade-up" />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden border border-border-default/80 bg-surface-primary/95 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl focus:outline-none',
            'inset-x-3 top-[calc(4.75rem+env(safe-area-inset-top))] max-h-[min(72dvh,calc(100dvh-11rem),640px)] rounded-[1.75rem]',
            'md:inset-y-4 md:right-4 md:left-auto md:h-auto md:w-[min(420px,calc(100vw-2rem))] md:rounded-[1.75rem]',
            'xl:top-24 xl:bottom-auto xl:right-8 xl:max-h-[calc(100dvh-8rem)]',
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border-default/70 bg-surface-primary/95 px-4 py-4 sm:px-5">
            <Dialog.Title className="text-base font-bold tracking-tight text-white">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close filters"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-deep hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 scrollbar-thin">
            <div className="space-y-5">{children}</div>
          </div>
          <div className="sticky bottom-0 z-10 grid grid-cols-2 gap-3 border-t border-border-default/70 bg-surface-primary/95 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5">
            <Button variant="secondary" onClick={onReset}>
              {resetLabel}
            </Button>
            <Button onClick={onApply}>{applyLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FilterSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{title}</h3>
      {children}
    </section>
  );
}

export const filterInputClass =
  'mt-2 h-11 w-full rounded-xl border border-border-default bg-surface-deep px-3 text-sm text-white outline-none transition placeholder:text-text-muted focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20';

export const filterCheckClass =
  'h-5 w-5 rounded border-border-default bg-surface-deep text-indigo-500 focus:ring-indigo-400/50';
