'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatInt, formatQty } from '@/lib/epass-aggregate';
import { formatReportDateCell, normalizeMineralLabel } from '@/lib/epass-consignee-view';
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
  getChallanHref?: (row: EpassChallanRowDto) => string | null;
  bodyLoading?: boolean;
  bodyLoadingRows?: number;
}

export function ConsigneeTable({
  rows,
  sortKey = null,
  sortDir = 'asc',
  onSort,
  getChallanHref,
  bodyLoading = false,
  bodyLoadingRows = 6,
}: ConsigneeTableProps) {
  const sortable = Boolean(onSort);

  if (rows.length === 0 && !bodyLoading) {
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
        {bodyLoading
          ? Array.from({ length: bodyLoadingRows }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border-default/60 bg-surface-deep/40"
              />
            ))
          : rows.map((row, index) => {
              const challanHref =
                row.challanCount > 0 && getChallanHref ? getChallanHref(row) : null;
              return (
                <MobileDataCard
                  key={row.id}
                  eyebrow={`Sl ${index + 1}`}
                  title={row.consigneeName}
                  subtitle={formatReportDateCell(row.reportDate)}
                  meta={
                    <>
                      <Chip tone="indigo">{normalizeMineralLabel(row.mineral)}</Chip>
                    </>
                  }
                  action={
                    challanHref ? (
                      <Link
                        href={challanHref}
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
                        challanHref ? (
                          <Link
                            href={challanHref}
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
                <SortHeader label="Report date" columnKey="date" />
                <SortHeader label="Consignee" columnKey="consignee" />
                <SortHeader label="Mineral" columnKey="mineral" />
                <SortHeader label="Passes" columnKey="passes" align="right" />
                <SortHeader label="Qty" columnKey="qty" align="right" />
                <th className="px-4 py-3">Unit</th>
              </tr>
            </thead>
            {bodyLoading ? (
              <tbody className="relative">
                {Array.from({ length: bodyLoadingRows }).map((_, i) => (
                  <tr key={i} className="border-b border-border-default/60">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-2.5">
                        <div
                          className="h-4 rounded bg-surface-deep/60"
                          style={{ opacity: 1 - i * 0.06 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="p-0">
                    <div
                      className="pointer-events-none absolute inset-0 skeleton-shimmer animate-shimmer will-change-[background-position]"
                      aria-hidden
                    />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {rows.map((row, index) => {
                  const challanHref =
                    row.challanCount > 0 && getChallanHref ? getChallanHref(row) : null;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border-default/60 transition hover:bg-indigo-500/5"
                    >
                      <td className="px-4 py-2.5 tabular-nums text-text-secondary">{index + 1}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-indigo-200/90">
                        {formatReportDateCell(row.reportDate)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-white">{row.consigneeName}</td>
                      <td className="px-4 py-2.5">{normalizeMineralLabel(row.mineral)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {challanHref ? (
                          <Link
                            href={challanHref}
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
            )}
          </table>
        </div>
      </Card>
    </>
  );
}
