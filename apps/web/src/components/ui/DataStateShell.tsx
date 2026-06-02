'use client';

import { type ReactNode } from 'react';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { Card } from '@/components/ui/Card';
import { SkeletonBone } from '@/components/ui/Skeleton';

interface DataStateShellProps {
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
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
  errorMessage,
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
    return <DataErrorCard message={errorMessage} onRetry={onRetry} />;
  }

  return <>{children}</>;
}
