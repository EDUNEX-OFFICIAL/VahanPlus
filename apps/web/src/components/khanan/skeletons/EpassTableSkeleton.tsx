import { memo } from 'react';
import { Card } from '@/components/ui/Card';

interface EpassTableSkeletonProps {
  rows?: number;
  minHeight?: string;
}

export const EpassTableSkeleton = memo(function EpassTableSkeleton({
  rows = 8,
  minHeight,
}: EpassTableSkeletonProps) {
  return (
    <div style={minHeight ? { minHeight } : undefined}>
      <Card className="relative overflow-hidden p-0">
        <div className="border-b border-border-default/60 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-3 flex-1 rounded bg-surface-deep/60"
                style={{ maxWidth: i === 0 ? '3rem' : undefined }}
              />
            ))}
          </div>
        </div>
        <div className="relative divide-y divide-border-default/40">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <div
                  key={j}
                  className="h-4 flex-1 rounded bg-surface-deep/60"
                  style={{ opacity: 1 - i * 0.06 }}
                />
              ))}
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-0 skeleton-shimmer animate-shimmer will-change-[background-position]"
            aria-hidden
          />
        </div>
      </Card>
    </div>
  );
});
