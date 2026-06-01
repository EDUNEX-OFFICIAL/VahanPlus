'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatInt, formatQty } from '@/lib/epass-aggregate';
import { formatReportDateCell } from '@/lib/epass-consignee-view';
import type { ConsigneeSortDir, ConsigneeSortKey, EpassChallanRowDto } from '@/lib/epass-types';

function SortIndicator({
  columnKey,
  sortKey,
  sortDir,
}: {
  columnKey: ConsigneeSortKey;
  sortKey: ConsigneeSortKey | null;
  sortDir: ConsigneeSortDir;
}) {
  if (sortKey !== columnKey) {
    return <span className="ml-1 text-text-secondary/40">↕</span>;
  }
  return <span className="ml-1 text-indigo-300">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

interface ConsigneeTableProps {
  rows: EpassChallanRowDto[];
  sortKey?: ConsigneeSortKey | null;
  sortDir?: ConsigneeSortDir;
  onSort?: (key: ConsigneeSortKey) => void;
  getChalaanHref?: (row: EpassChallanRowDto) => string | null;
}

export function ConsigneeTable({
  rows,
  sortKey = null,
  sortDir = 'asc',
  onSort,
  getChalaanHref,
}: ConsigneeTableProps) {
  const sortable = Boolean(onSort);

  if (rows.length === 0) {
    return <EmptyStateCard message="No consignee lines found" />;
  }

  function SortHeader({
    label,
    columnKey,
    align,
  }: {
    label: string;
    columnKey: ConsigneeSortKey;
    align?: 'right';
  }) {
    if (!sortable || !onSort) {
      return <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}>{label}</th>;
    }
    return (
      <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}>
        <button
          type="button"
          onClick={() => onSort(columnKey)}
          className={`inline-flex items-center uppercase tracking-wider hover:text-white ${align === 'right' ? 'ml-auto' : ''}`}
        >
          {label}
          <SortIndicator columnKey={columnKey} sortKey={sortKey} sortDir={sortDir} />
        </button>
      </th>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const chalaanHref = row.challanCount > 0 && getChalaanHref ? getChalaanHref(row) : null;
          return (
            <MobileDataCard
              key={row.id}
              eyebrow={`Sl ${row.slNo}`}
              title={row.consigneeName}
              subtitle={formatReportDateCell(row.reportDate)}
              meta={
                <>
                  <Chip tone="indigo">{row.mineral ?? 'Mineral NA'}</Chip>
                  <Chip>{row.mineralCategory ?? 'Category NA'}</Chip>
                </>
              }
              action={
                chalaanHref ? (
                  <Link
                    href={chalaanHref}
                    className="inline-flex min-h-10 items-center rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3 text-xs font-bold text-indigo-100"
                  >
                    View
                  </Link>
                ) : null
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <DataField
                  label="Passes"
                  value={
                    chalaanHref ? (
                      <Link
                        href={chalaanHref}
                        className="text-indigo-200 underline-offset-2 hover:underline"
                      >
                        {formatInt(row.challanCount)}
                      </Link>
                    ) : (
                      formatInt(row.challanCount)
                    )
                  }
                />
                <DataField label="Qty" value={formatQty(row.dispatchedQty)} />
                <DataField className="col-span-2" label="Unit" value={row.unit ?? '—'} />
              </div>
            </MobileDataCard>
          );
        })}
      </div>
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="max-h-[min(68vh,760px)] overflow-auto overscroll-contain scrollbar-thin">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-primary">
              <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
                <SortHeader label="Sl" columnKey="slNo" />
                <SortHeader label="Date" columnKey="date" />
                <SortHeader label="Consignee" columnKey="consignee" />
                <SortHeader label="Mineral" columnKey="mineral" />
                <th className="px-4 py-3">Category</th>
                <SortHeader label="Passes" columnKey="passes" align="right" />
                <SortHeader label="Qty" columnKey="qty" align="right" />
                <th className="px-4 py-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const chalaanHref =
                  row.challanCount > 0 && getChalaanHref ? getChalaanHref(row) : null;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border-default/60 transition hover:bg-indigo-500/5"
                  >
                    <td className="px-4 py-2.5 tabular-nums text-text-secondary">{row.slNo}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-indigo-200/90">
                      {formatReportDateCell(row.reportDate)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-white">{row.consigneeName}</td>
                    <td className="px-4 py-2.5">{row.mineral ?? '—'}</td>
                    <td className="px-4 py-2.5">{row.mineralCategory ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {chalaanHref ? (
                        <Link
                          href={chalaanHref}
                          className="font-medium text-indigo-300 underline-offset-2 hover:underline tabular-nums"
                        >
                          {formatInt(row.challanCount)}
                        </Link>
                      ) : (
                        <span className="tabular-nums text-text-secondary">
                          {formatInt(row.challanCount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatQty(row.dispatchedQty)}
                    </td>
                    <td className="px-4 py-2.5">{row.unit ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
