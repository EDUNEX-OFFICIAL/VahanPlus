'use client';

import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataStateShell } from '@/components/ui/DataStateShell';
import { EPASS_LATEST_QUERY_KEY, fetchLatestEpass } from '@/lib/epass';

export function useLatestEpassQuery() {
  return useQuery({
    queryKey: EPASS_LATEST_QUERY_KEY,
    queryFn: () => fetchLatestEpass(),
  });
}

interface EpassQueryShellProps {
  children: (data: NonNullable<ReturnType<typeof useLatestEpassQuery>['data']>) => ReactNode;
}

export function EpassQueryShell({ children }: EpassQueryShellProps) {
  const { data, isLoading, isError, refetch } = useLatestEpassQuery();

  return (
    <DataStateShell isLoading={isLoading} isError={isError || !data} onRetry={() => refetch()}>
      {data ? children(data) : null}
    </DataStateShell>
  );
}
