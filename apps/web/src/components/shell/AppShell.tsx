'use client';

import { ReactNode, useState } from 'react';
import { AmbientBlobs } from './AmbientBlobs';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ResponsiveContainer } from '@/components/ui/ResponsiveLayout';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: ReactNode }) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AmbientBlobs />
      <Sidebar desktopCollapsed={desktopCollapsed} onDesktopCollapsedChange={setDesktopCollapsed} />
      <div
        className={cn(
          'relative z-10 flex min-h-dvh flex-col transition-[padding] duration-300',
          desktopCollapsed ? 'xl:pl-[88px]' : 'xl:pl-[272px]',
        )}
      >
        <Header />
        <main className="flex-1 pb-28 pt-4 sm:pt-5 lg:pt-6 xl:pb-8">
          <ResponsiveContainer>{children}</ResponsiveContainer>
        </main>
      </div>
    </div>
  );
}
