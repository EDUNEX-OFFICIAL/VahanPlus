import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function MobileDataCard({
  eyebrow,
  title,
  subtitle,
  meta,
  action,
  children,
  className,
  onClick,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const Component = interactive ? motion.button : motion.article;

  return (
    <Component
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border border-border-default/80 bg-surface-primary/75 p-4 text-left shadow-lg shadow-black/20 backdrop-blur-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-deep',
        interactive && 'transition hover:border-indigo-400/50 hover:bg-indigo-500/[0.07]',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl transition group-hover:bg-indigo-500/20" />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-400">
                {eyebrow}
              </div>
            ) : null}
            <div className="break-words text-base font-bold leading-snug text-white">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-sm leading-snug text-text-secondary">{subtitle}</div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
        {children ? <div className="space-y-2">{children}</div> : null}
      </div>
    </Component>
  );
}

export function DataField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-xl border border-border-default/60 bg-surface-deep/55 p-3', className)}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-white">{value}</div>
    </div>
  );
}
