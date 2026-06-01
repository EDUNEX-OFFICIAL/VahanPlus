import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hero?: boolean;
}

export function Card({ children, className = '', hero = false }: CardProps) {
  if (hero) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[1.75rem] border border-border-default/80 bg-gradient-to-b from-[#0d1020]/95 via-surface-primary/90 to-surface-deep/95 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6 lg:p-8',
          className,
        )}
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        {children}
      </div>
    );
  }
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-default/80 bg-surface-primary/75 p-4 shadow-lg shadow-black/20 backdrop-blur-xl sm:p-5 lg:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
