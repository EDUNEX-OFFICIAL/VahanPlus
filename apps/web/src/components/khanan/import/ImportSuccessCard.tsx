'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { formatReportDateNumeric } from '@/lib/epass-report-date';
import { consignerBrowseDateRangeUrl, type ImportSuccessSummary } from '@/lib/epass-import';

interface ImportSuccessCardProps {
  message: string;
  summary?: ImportSuccessSummary | null;
}

export function ImportSuccessCard({ message, summary }: ImportSuccessCardProps) {
  const dateFrom = summary?.dateFrom;
  const dateTo = summary?.dateTo;
  const showRangeLink = Boolean(dateFrom && dateTo);

  return (
    <Card className="space-y-3 border-emerald-500/30 bg-emerald-500/5">
      <p className="text-sm text-emerald-100">{message}</p>
      {summary?.snapshotsCreated != null && summary.snapshotsCreated > 1 ? (
        <p className="text-xs text-text-secondary">
          {summary.snapshotsCreated.toLocaleString()} import snapshot(s) created (one per report
          date). Consigner browse shows one snapshot at a time unless you use a date range.
        </p>
      ) : null}
      {showRangeLink ? (
        <Link
          href={consignerBrowseDateRangeUrl(dateFrom!, dateTo!)}
          className="inline-flex text-sm font-medium text-indigo-300 hover:text-indigo-200"
        >
          Browse date range ({formatReportDateNumeric(dateFrom!)} –{' '}
          {formatReportDateNumeric(dateTo!)})
        </Link>
      ) : null}
    </Card>
  );
}
