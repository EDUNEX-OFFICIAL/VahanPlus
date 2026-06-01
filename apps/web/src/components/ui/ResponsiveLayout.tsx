import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ResponsiveContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] px-4 sm:px-5 lg:px-8', className)}>
      {children}
    </div>
  );
}

export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('animate-slide-right space-y-4 sm:space-y-5 lg:space-y-7', className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-400 sm:text-xs">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 bg-gradient-to-r from-white via-indigo-100 to-indigo-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl xl:text-5xl">
          {title}
        </h2>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
