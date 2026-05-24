import { ReactNode } from 'react';
import { AmbientBlobs } from './AmbientBlobs';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden">
      <AmbientBlobs />
      <Sidebar />
      <div className="relative z-10 ml-[272px] flex h-screen flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
