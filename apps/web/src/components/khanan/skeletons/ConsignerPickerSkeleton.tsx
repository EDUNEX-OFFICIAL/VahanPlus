import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { SkeletonBone } from '@/components/ui/Skeleton';

export const ConsignerPickerSkeleton = memo(function ConsignerPickerSkeleton() {
  return (
    <Card className="p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        Consigner
      </span>
      <SkeletonBone className="mt-2 h-12 w-full rounded-xl" />
    </Card>
  );
});
