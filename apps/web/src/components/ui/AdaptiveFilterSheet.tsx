'use client';

import { CSSProperties, ReactNode, RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';

const FILTER_PANEL_ATTR = 'data-filter-dropdown-panel';

export function isFilterPanelTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(`[${FILTER_PANEL_ATTR}]`));
}

const filterPanelFooterClass =
  'relative z-10 grid shrink-0 grid-cols-2 gap-3 border-t border-border-default bg-surface-primary px-4 py-3 shadow-[0_-10px_24px_rgba(0,0,0,0.5)]';

function useFilterBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;

    const scrollY = window.scrollY;
    const { body, documentElement: html } = document;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      html.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function computeDesktopPanelStyle(anchorRef: RefObject<HTMLElement | null>): CSSProperties | null {
  const el = anchorRef.current;
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(420, vw - 32);
  const left = Math.min(Math.max(16, rect.left), vw - width - 16);
  const gap = 8;
  const maxPanelH = 680;
  const spaceBelow = vh - rect.bottom - gap - 16;
  const spaceAbove = rect.top - gap - 16;

  let top: number;
  let maxHeight: number;

  if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
    top = rect.bottom + gap;
    maxHeight = Math.min(maxPanelH, Math.max(200, spaceBelow));
  } else {
    maxHeight = Math.min(maxPanelH, Math.max(200, spaceAbove));
    top = Math.max(16, rect.top - gap - maxHeight);
  }

  return {
    position: 'fixed',
    top,
    left,
    width,
    maxHeight,
  };
}

function useFilterPanelPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
): CSSProperties | null {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }

    function update() {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      if (!isDesktop) {
        setStyle(null);
        return;
      }
      setStyle(computeDesktopPanelStyle(anchorRef));
    }

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef]);

  return style;
}

function useFilterEscapeDismiss(open: boolean, onClose?: () => void) {
  useEffect(() => {
    const dismiss = onClose;
    if (!open || !dismiss) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss?.();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
}

function useFilterOutsideDismiss(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  onClose?: () => void,
) {
  useEffect(() => {
    const dismiss = onClose;
    if (!open || !dismiss) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if ((target as Element).closest?.(`[${FILTER_PANEL_ATTR}]`)) return;
      dismiss?.();
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, anchorRef, onClose]);
}

export function FilterDropdownPanel({
  open,
  anchorRef,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  title?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onClose?: () => void;
}) {
  const [mounted, setMounted] = useState(() => typeof document !== 'undefined');
  const desktopStyle = useFilterPanelPosition(anchorRef, open);

  useEffect(() => {
    setMounted(true);
  }, []);
  useFilterBodyScrollLock(open);
  useFilterOutsideDismiss(open, anchorRef, onClose);
  useFilterEscapeDismiss(open, onClose);

  if (!open) return null;

  const bodyContent = (
    <>
      {title ? <p className="mb-4 text-base font-bold tracking-tight text-white">{title}</p> : null}
      {children}
    </>
  );

  const panelBodyClass =
    'min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-4 scrollbar-thin';

  const mobileSheet = (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-[35] touch-none bg-black/65 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      <Card
        data-filter-dropdown-panel=""
        className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[36] flex max-h-[70dvh] flex-col overflow-hidden rounded-[1.75rem] border border-border-default/80 bg-surface-primary p-0 shadow-2xl md:hidden"
      >
        <div className={panelBodyClass}>{bodyContent}</div>
        <div className={filterPanelFooterClass}>{footer}</div>
      </Card>
    </>
  );

  const desktopPanel = desktopStyle ? (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-[35] hidden touch-none bg-black/20 md:block"
        onClick={onClose}
      />
      <div
        data-filter-dropdown-panel=""
        style={desktopStyle}
        className="z-[36] hidden flex-col overflow-hidden rounded-[1.75rem] border border-border-default/80 bg-surface-primary p-0 shadow-2xl md:flex"
      >
        <div className={panelBodyClass}>{bodyContent}</div>
        <div className={filterPanelFooterClass}>{footer}</div>
      </div>
    </>
  ) : null;

  return (
    <>
      {mounted ? createPortal(mobileSheet, document.body) : null}
      {mounted && desktopPanel ? createPortal(desktopPanel, document.body) : null}
    </>
  );
}

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
            'inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] max-h-[70dvh] rounded-[1.75rem]',
            'md:inset-auto md:bottom-auto md:left-4 md:top-[calc(5.25rem+env(safe-area-inset-top))] md:max-h-[min(78dvh,680px)] md:w-[min(420px,calc(100vw-2rem))] md:rounded-[1.75rem]',
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-default/70 bg-surface-primary/95 px-4 py-4 sm:px-5">
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
          <div className="touch-pan-y overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 scrollbar-thin md:min-h-0 md:flex-1">
            <div className="space-y-5">{children}</div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-border-default/70 bg-surface-primary px-4 py-4 sm:px-5">
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
