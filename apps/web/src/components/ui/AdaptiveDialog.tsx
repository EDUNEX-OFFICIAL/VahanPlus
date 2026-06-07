'use client';

import { ReactNode, useEffect, useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdaptiveDialog({
  open,
  onOpenChange,
  title,
  eyebrow,
  subtitle,
  children,
  footer,
  className,
  collapsible = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  useEffect(() => {
    if (!collapsible) setExpanded(false);
  }, [collapsible]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex overflow-hidden border border-border-default/80 bg-surface-primary/95 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl focus:outline-none',
            'inset-x-0 bottom-0 h-[min(94dvh,820px)] flex-col rounded-t-[1.75rem]',
            'md:left-1/2 md:top-1/2 md:bottom-auto md:h-auto md:max-h-[88dvh] md:w-[min(calc(100vw-2rem),760px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.75rem]',
            className,
          )}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border-default/70 bg-gradient-to-r from-indigo-500/10 via-surface-primary/95 to-surface-primary/95 px-5 py-4">
            <div className="min-w-0">
              {eyebrow ? (
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                  {eyebrow}
                </div>
              ) : null}
              <Dialog.Title className="mt-1 break-words text-lg font-bold tracking-tight text-white sm:text-xl">
                {title}
              </Dialog.Title>
              {subtitle ? (
                <Dialog.Description className="mt-1 text-sm text-text-secondary">
                  {subtitle}
                </Dialog.Description>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {collapsible ? (
                <button
                  type="button"
                  aria-label={expanded ? 'Collapse details' : 'Expand details'}
                  aria-expanded={expanded}
                  aria-controls={contentId}
                  onClick={() => setExpanded((v) => !v)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-deep hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                >
                  {expanded ? (
                    <Minimize2 className="h-5 w-5" aria-hidden />
                  ) : (
                    <Maximize2 className="h-5 w-5" aria-hidden />
                  )}
                </button>
              ) : null}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-deep hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div
            id={contentId}
            aria-hidden={collapsible && !expanded ? true : undefined}
            className={cn(
              'relative flex-1 overscroll-contain p-5',
              collapsible && !expanded
                ? 'max-h-[min(42vh,320px)] overflow-hidden'
                : 'overflow-y-auto scrollbar-none',
            )}
          >
            <div className={cn(collapsible && !expanded && 'pointer-events-none')}>{children}</div>
            {collapsible && !expanded ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-primary/95 to-transparent"
              />
            ) : null}
          </div>
          {footer ? (
            <div className="sticky bottom-0 z-10 border-t border-border-default/70 bg-surface-primary/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
