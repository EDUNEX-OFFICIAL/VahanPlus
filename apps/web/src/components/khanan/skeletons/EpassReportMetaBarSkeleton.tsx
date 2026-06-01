import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { SkeletonBone } from '@/components/ui/Skeleton';

function Block() {
  return (
    <div className="space-y-2">
      <SkeletonBone className="h-3 w-16" />
      <SkeletonBone className="h-5 w-24" />
    </div>
  );
}

export const EpassReportMetaBarSkeleton = memo(function EpassReportMetaBarSkeleton() {
  return (
    <Card>
      <SkeletonBone className="h-3 w-28" />
      <div className="mt-4 flex flex-wrap gap-6">
        <Block />
        <Block />
        <Block />
        <Block />
      </div>
    </Card>
  );
});
