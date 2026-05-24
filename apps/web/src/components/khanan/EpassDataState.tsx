'use client';

import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getToken } from '@/lib/auth';
import { EPASS_LATEST_QUERY_KEY, fetchLatestEpass } from '@/lib/epass';

export function useLatestEpassQuery() {
  return useQuery({
    queryKey: EPASS_LATEST_QUERY_KEY,
    queryFn: () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      return fetchLatestEpass(token);
    },
  });
}

interface EpassQueryShellProps {
  children: (data: NonNullable<ReturnType<typeof useLatestEpassQuery>['data']>) => ReactNode;
}

export function EpassQueryShell({ children }: EpassQueryShellProps) {
  const { data, isLoading, isError, refetch } = useLatestEpassQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <div className="h-4 w-32 rounded bg-surface-deep" />
          <div className="mt-4 h-6 w-64 rounded bg-surface-deep" />
        </Card>
        <Card className="animate-pulse p-12">
          <div className="h-48 rounded bg-surface-deep" />
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-500/30">
        <p className="text-sm font-semibold text-red-400">Unable to load data</p>
        <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  return <>{children(data)}</>;
}
