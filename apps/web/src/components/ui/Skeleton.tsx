import { memo } from 'react';
import { cn } from '@/lib/utils';

export const SkeletonBone = memo(function SkeletonBone({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer animate-shimmer rounded', className)} aria-hidden />;
});

export function Skeleton({ className = '' }: { className?: string }) {
  return <SkeletonBone className={cn('rounded-2xl', className)} />;
}
