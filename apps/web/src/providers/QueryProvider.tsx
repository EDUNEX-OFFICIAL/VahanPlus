'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { attachQueryInstrumentation } from '@/lib/query-instrumentation';
import { queryClientDefaults } from '@/lib/query-config';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: queryClientDefaults,
        },
      }),
  );

  useEffect(() => {
    return attachQueryInstrumentation(client);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
