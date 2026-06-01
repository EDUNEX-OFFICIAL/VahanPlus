'use client';

import { usePathname } from 'next/navigation';
import { getPageEyebrow, getPageTitle } from '@/lib/nav-config';

export function Header() {
  const pathname = usePathname();
  const eyebrow = getPageEyebrow(pathname);
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex min-h-16 shrink-0 items-center border-b border-border-default/60 bg-surface-primary/75 px-4 backdrop-blur-xl sm:px-5 lg:px-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-400 sm:text-xs">
          {eyebrow}
        </p>
        <h1 className="bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl lg:text-3xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
