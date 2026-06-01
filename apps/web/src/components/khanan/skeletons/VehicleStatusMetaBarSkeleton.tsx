import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { SkeletonBone } from '@/components/ui/Skeleton';

export const VehicleStatusMetaBarSkeleton = memo(function VehicleStatusMetaBarSkeleton() {
  return (
    <Card>
      <SkeletonBone className="h-3 w-36" />
      <div className="mt-4 flex flex-wrap gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBone className="h-3 w-20" />
            <SkeletonBone className="h-5 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
});
