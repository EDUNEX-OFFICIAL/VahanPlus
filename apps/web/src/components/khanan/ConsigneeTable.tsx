'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
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
    return (
      <Card>
        <p className="text-sm text-text-secondary">No consignee lines found</p>
      </Card>
    );
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
      return (
        <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}>{label}</th>
      );
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
    <Card className="overflow-hidden p-0">
      <div className="max-h-[calc(100vh-320px)] overflow-auto scrollbar-thin">
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
                <td className="px-4 py-2.5 text-right tabular-nums">{formatQty(row.dispatchedQty)}</td>
                <td className="px-4 py-2.5">{row.unit ?? '—'}</td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
