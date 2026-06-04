import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChipTone = 'default' | 'indigo' | 'emerald' | 'amber' | 'red' | 'cyan';

const tones: Record<ChipTone, string> = {
  default: 'border-border-default bg-surface-deep/80 text-text-secondary',
  indigo: 'border-indigo-500/35 bg-indigo-500/12 text-indigo-200',
  emerald: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-200',
  amber: 'border-amber-500/35 bg-amber-500/12 text-amber-200',
  red: 'border-red-500/35 bg-red-500/12 text-red-200',
  cyan: 'border-cyan-500/35 bg-cyan-500/12 text-cyan-200',
};

export function Chip({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
