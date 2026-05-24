import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hero?: boolean;
}

export function Card({ children, className = '', hero = false }: CardProps) {
  if (hero) {
    return (
      <div
        className={`relative overflow-hidden rounded-3xl border border-border-default bg-gradient-to-b from-[#0d1020] via-surface-primary to-surface-deep p-6 shadow-lg ${className}`}
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        {children}
      </div>
    );
  }
  return (
    <div
      className={`rounded-2xl border border-border-default bg-surface-primary/80 p-6 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}
