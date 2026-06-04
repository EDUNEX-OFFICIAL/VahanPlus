'use client';

import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { PageStack } from '@/components/ui/ResponsiveLayout';

export const CrmExpiryPageSkeleton = memo(function CrmExpiryPageSkeleton() {
  return (
    <PageStack>
      <div className="h-9 w-48 animate-pulse rounded-lg bg-surface-deep" />
      <Card className="h-24 animate-pulse">
        <span className="sr-only">Loading</span>
      </Card>
      <div className="h-11 w-28 animate-pulse rounded-lg bg-surface-deep" />
      <Card className="h-64 animate-pulse">
        <span className="sr-only">Loading</span>
      </Card>
    </PageStack>
  );
});

export const CrmExpiryPageLoading = memo(function CrmExpiryPageLoading() {
  return (
    <Card className="h-64 animate-pulse">
      <span className="sr-only">Loading</span>
    </Card>
  );
});
