'use client';

import { EpassQueryShell } from '@/components/khanan/EpassDataState';
import { EpassReportMetaBar } from '@/components/khanan/EpassReportMetaBar';
import { MineralSummaryTable } from '@/components/khanan/MineralSummaryTable';
import { aggregateMinerals } from '@/lib/epass-aggregate';

export default function MineralPage() {
  return (
    <div className="animate-slide-right space-y-6">
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
    </div>
  );
}
