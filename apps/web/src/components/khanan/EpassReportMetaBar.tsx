import { EpassReportMetaBarSkeleton } from '@/components/khanan/skeletons/EpassReportMetaBarSkeleton';
import { Card } from '@/components/ui/Card';
import {
  formatDateDmy,
  formatReportDateLong,
  formatReportDateNumeric,
} from '@/lib/epass-report-date';
import type { EpassSnapshotDto } from '@/lib/epass-types';

interface EpassReportMetaBarProps {
  snapshot: EpassSnapshotDto | null;
  isLoading?: boolean;
  reportScope?: 'all' | 'range';
  snapshotCount?: number;
  totalSnapshotCount?: number;
  snapshotsTruncated?: boolean;
  latestScrapedAt?: string | null;
  dateFrom?: string;
  dateTo?: string;
}

export function EpassReportMetaBar({
  snapshot,
  isLoading = false,
  reportScope,
  snapshotCount,
  totalSnapshotCount,
  snapshotsTruncated,
  latestScrapedAt,
  dateFrom,
  dateTo,
}: EpassReportMetaBarProps) {
  if (isLoading) {
    return <EpassReportMetaBarSkeleton />;
  }

  if (reportScope === 'all' || reportScope === 'range') {
    const latestLabel = latestScrapedAt ? formatDateDmy(new Date(latestScrapedAt)) : '—';
    const scopeLabel =
      reportScope === 'range'
        ? dateFrom || dateTo
          ? `${dateFrom ? formatReportDateNumeric(dateFrom) : '…'} – ${dateTo ? formatReportDateNumeric(dateTo) : dateFrom ? formatReportDateNumeric(dateFrom) : '…'}`
          : 'Date range'
        : 'All reports';

    return (
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">ePass report</p>
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-secondary">Scope</p>
            <p className="mt-1 font-semibold text-white">{scopeLabel}</p>
          </div>
          {snapshotCount != null && snapshotCount > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">Snapshots</p>
              <p className="mt-1 font-semibold tabular-nums text-white">
                {snapshotCount}
                {snapshotsTruncated && totalSnapshotCount != null
                  ? ` of ${totalSnapshotCount}`
                  : null}
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-wider text-text-secondary">Latest scraped</p>
            <p className="mt-1 font-semibold text-white">{latestLabel}</p>
          </div>
        </div>
        {snapshotsTruncated ? (
          <p className="mt-3 text-xs text-amber-300/90">
            Showing latest {snapshotCount} snapshots only. Older reports are omitted from totals.
          </p>
        ) : null}
      </Card>
    );
  }

  if (!snapshot) {
    return null;
  }

  const scrapedDate = formatDateDmy(new Date(snapshot.scrapedAt));

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">ePass report</p>
      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Report date</p>
          <p className="mt-1 font-semibold text-white">
            {formatReportDateLong(snapshot.reportDate)}
          </p>
        </div>
        {snapshot.reportGeneratedOn ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-text-secondary">Portal generated</p>
            <p className="mt-1 font-semibold text-white">{snapshot.reportGeneratedOn}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Scraped at</p>
          <p className="mt-1 font-semibold text-white">{scrapedDate}</p>
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
