'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { buildConsigneeHref } from '@/lib/epass-filter-params';

function ConsignerChallansRedirectInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (id) {
      router.replace(buildConsigneeHref(id, new URLSearchParams(searchParams.toString())));
    } else {
      router.replace('/khanan/consignee');
    }
  }, [id, router, searchParams]);

  return (
    <Card className="animate-pulse p-12">
      <div className="h-8 w-48 rounded bg-surface-deep" />
    </Card>
  );
}

export default function ConsignerChallansRedirectPage() {
  return (
    <Suspense
      fallback={
        <Card className="animate-pulse p-12">
          <div className="h-8 w-48 rounded bg-surface-deep" />
        </Card>
      }
    >
      <ConsignerChallansRedirectInner />
    </Suspense>
  );
}
