import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { SkeletonBone } from '@/components/ui/Skeleton';

export const EpassFiltersSkeleton = memo(function EpassFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SkeletonBone className="h-10 w-24 rounded-xl" />
      <SkeletonBone className="h-7 w-14 rounded-full" />
      <SkeletonBone className="h-7 w-28 rounded-full" />
    </div>
  );
});

export const EpassFiltersPanelSkeleton = memo(function EpassFiltersPanelSkeleton() {
  return (
    <Card className="p-4">
      <EpassFiltersSkeleton />
    </Card>
  );
});
