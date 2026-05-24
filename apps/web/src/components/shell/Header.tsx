'use client';

import { usePathname } from 'next/navigation';
import { getPageEyebrow, getPageTitle } from '@/lib/nav-config';

export function Header() {
  const pathname = usePathname();
  const eyebrow = getPageEyebrow(pathname);
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-border-default/60 bg-surface-primary/80 px-8 backdrop-blur-md">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">{eyebrow}</p>
        <h1 className="bg-gradient-to-r from-white to-indigo-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          {title}
        </h1>
      </div>
    </header>
  );
}
