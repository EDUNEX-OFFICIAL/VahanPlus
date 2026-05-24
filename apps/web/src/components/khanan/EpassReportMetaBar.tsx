import { Card } from '@/components/ui/Card';
import type { EpassSnapshotDto } from '@/lib/epass-types';

interface EpassReportMetaBarProps {
  snapshot: EpassSnapshotDto | null;
}

export function EpassReportMetaBar({ snapshot }: EpassReportMetaBarProps) {
  if (!snapshot) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <p className="text-sm text-text-secondary">No data available</p>
      </Card>
    );
  }

  const scraped = new Date(snapshot.scrapedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">ePass report</p>
      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Report date</p>
          <p className="mt-1 font-semibold text-white">{snapshot.reportDate}</p>
        </div>
        {snapshot.reportGeneratedOn ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-text-secondary">Portal generated</p>
            <p className="mt-1 font-semibold text-white">{snapshot.reportGeneratedOn}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Scraped at</p>
          <p className="mt-1 font-semibold text-white">{scraped}</p>
        </div>
        {snapshot.rowCount > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-text-secondary">Rows</p>
            <p className="mt-1 font-semibold tabular-nums text-white">{snapshot.rowCount}</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
