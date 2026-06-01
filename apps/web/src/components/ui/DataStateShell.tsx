'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonBone } from '@/components/ui/Skeleton';

interface DataStateShellProps {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  metaSkeleton?: ReactNode;
  filtersSkeleton?: ReactNode;
  tableSkeleton?: ReactNode;
  children?: ReactNode;
}

function DefaultMetaSkeleton() {
  return (
    <Card className="space-y-4">
      <SkeletonBone className="h-4 w-32" />
      <SkeletonBone className="h-6 w-64" />
    </Card>
  );
}

function DefaultTableSkeleton() {
  return (
    <Card className="p-12">
      <SkeletonBone className="h-48 w-full" />
    </Card>
  );
}

export function DataStateShell({
  isLoading,
  isError,
  onRetry,
  metaSkeleton,
  filtersSkeleton,
  tableSkeleton,
  children,
}: DataStateShellProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {metaSkeleton ?? <DefaultMetaSkeleton />}
        {filtersSkeleton ?? null}
        {tableSkeleton ?? <DefaultTableSkeleton />}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-500/30">
        <p className="text-sm font-semibold text-red-400">Unable to load data</p>
        {onRetry ? (
          <Button className="mt-4" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </Card>
    );
  }

  return <>{children}</>;
}
