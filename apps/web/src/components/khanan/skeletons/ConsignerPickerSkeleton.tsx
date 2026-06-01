import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { SkeletonBone } from '@/components/ui/Skeleton';

export const ConsignerPickerSkeleton = memo(function ConsignerPickerSkeleton() {
  return (
    <Card className="p-4">
      <SkeletonBone className="h-3 w-20" />
      <SkeletonBone className="mt-3 h-12 w-full rounded-xl" />
    </Card>
  );
});
