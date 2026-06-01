'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatInt, formatQty } from '@/lib/epass-aggregate';
import { buildConsignerListHref } from '@/lib/epass-filter-params';
import type {
  ConsignerScrapeStatus,
  DistrictFlatRow,
  DistrictOperatorFilter,
  DistrictSortDir,
  DistrictSortKey,
} from '@/lib/epass-types';

function PassCountLink({
  district,
  operatorFilter,
  count,
  scrapeStatus,
  linkSearchParams,
}: {
  district: string;
  operatorFilter: DistrictOperatorFilter;
  count: number;
  scrapeStatus?: ConsignerScrapeStatus;
  linkSearchParams?: URLSearchParams;
}) {
  if (count <= 0) {
    return <span className="tabular-nums text-text-secondary">{formatInt(count)}</span>;
  }

  const href = linkSearchParams
    ? buildConsignerListHref(linkSearchParams, {
        district,
        operator:
          operatorFilter === 'lessee' || operatorFilter === 'dealer' ? operatorFilter : null,
      })
    : `/khanan/consigner?${new URLSearchParams({
        district,
        ...(operatorFilter === 'lessee' || operatorFilter === 'dealer'
          ? { operator: operatorFilter }
          : {}),
      }).toString()}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Link
        href={href}
        className="tabular-nums font-medium text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
      >
        {formatInt(count)}
      </Link>
      {scrapeStatus === 'pending' ? (
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
          pending
        </span>
      ) : null}
      {scrapeStatus === 'partial' ? (
        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
          partial
        </span>
      ) : null}
    </span>
  );
}

const COLUMNS: { key: DistrictSortKey; label: string; align?: 'right' }[] = [
  { key: 'district', label: 'District' },
  { key: 'totalUsers', label: 'Total Number of Users', align: 'right' },
  { key: 'mineral', label: 'Mineral' },
  { key: 'passes', label: 'No. of Passes', align: 'right' },
  { key: 'quantity', label: 'Quantity', align: 'right' },
];

function SortIndicator({
  columnKey,
  sortKey,
  sortDir,
}: {
  columnKey: DistrictSortKey;
  sortKey: DistrictSortKey | null;
  sortDir: DistrictSortDir;
}) {
  if (sortKey !== columnKey) {
    return <span className="ml-1 text-text-secondary/40">↕</span>;
  }
  return <span className="ml-1 text-indigo-300">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

interface DistrictEpassTableProps {
  rows: DistrictFlatRow[];
  operatorFilter: DistrictOperatorFilter;
  sortKey: DistrictSortKey | null;
  sortDir: DistrictSortDir;
  onSort: (key: DistrictSortKey) => void;
  linkSearchParams?: URLSearchParams;
}

export function DistrictEpassTable({
  rows,
  operatorFilter,
  sortKey,
  sortDir,
  onSort,
  linkSearchParams,
}: DistrictEpassTableProps) {
  if (rows.length === 0) {
    return <EmptyStateCard message="No data available" />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <MobileDataCard
            key={row.district}
            eyebrow="District"
            title={row.district}
            subtitle={row.mineralLabel}
            meta={
              <>
                <Chip tone="indigo">
                  {operatorFilter === 'all' ? 'All operators' : operatorFilter}
                </Chip>
                {row.scrapeStatus === 'pending' ? <Chip tone="amber">pending</Chip> : null}
                {row.scrapeStatus === 'partial' ? <Chip tone="cyan">partial</Chip> : null}
              </>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <DataField label="Users" value={formatInt(row.totalUsers)} />
              <DataField
                label="Passes"
                value={
                  <PassCountLink
                    district={row.district}
                    operatorFilter={operatorFilter}
                    count={row.passes}
                    scrapeStatus={row.scrapeStatus}
                    linkSearchParams={linkSearchParams}
                  />
                }
              />
              <DataField className="col-span-2" label="Quantity" value={formatQty(row.quantity)} />
            </div>
          </MobileDataCard>
        ))}
      </div>
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="max-h-[min(68vh,760px)] overflow-auto overscroll-contain scrollbar-thin">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-primary">
              <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-semibold ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={`inline-flex items-center uppercase tracking-wider hover:text-white ${col.align === 'right' ? 'ml-auto' : ''}`}
                    >
                      {col.label}
                      <SortIndicator columnKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.district}
                  className="border-b border-border-default/60 transition hover:bg-indigo-500/5"
                >
                  <td className="px-4 py-2.5 font-medium text-white">{row.district}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatInt(row.totalUsers)}
                  </td>
                  <td className="px-4 py-2.5 text-indigo-200/90">{row.mineralLabel}</td>
                  <td className="px-4 py-2.5 text-right">
                    <PassCountLink
                      district={row.district}
                      operatorFilter={operatorFilter}
                      count={row.passes}
                      scrapeStatus={row.scrapeStatus}
                      linkSearchParams={linkSearchParams}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatQty(row.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
