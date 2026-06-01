'use client';

import { EpassQueryShell } from '@/components/khanan/EpassDataState';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { MineralSummaryTable } from '@/components/khanan/MineralSummaryTable';
import { PageStack } from '@/components/ui/ResponsiveLayout';
import { aggregateMinerals } from '@/lib/epass-aggregate';

export default function MineralPage() {
  return (
    <PageStack>
      <EpassQueryShell>
        {(data) => {
          const minerals = data.snapshot ? aggregateMinerals(data.rows) : [];
          return (
            <>
              <EpassReportMetaBar snapshot={data.snapshot} />
              {data.snapshot ? <MineralSummaryTable minerals={minerals} /> : null}
            </>
          );
        }}
      </EpassQueryShell>
    </PageStack>
  );
}
