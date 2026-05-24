'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { formatInt } from '@/lib/epass-aggregate';
import { buildConsigneeHref } from '@/lib/epass-filter-params';
import { formatOperatorType } from '@/lib/operator';
import type {
  ConsignerSortDir,
  ConsignerSortKey,
  EpassConsignerListItemDto,
  EpassConsignerRowDto,
} from '@/lib/epass-types';

type ConsignerRow = EpassConsignerRowDto | EpassConsignerListItemDto;

function hasDmo(row: ConsignerRow): row is EpassConsignerListItemDto {
  return 'dmoName' in row;
}

function SortIndicator({
  columnKey,
  sortKey,
  sortDir,
}: {
  columnKey: ConsignerSortKey;
  sortKey: ConsignerSortKey | null;
  sortDir: ConsignerSortDir;
}) {
  if (sortKey !== columnKey) {
    return <span className="ml-1 text-text-secondary/40">↕</span>;
  }
  return <span className="ml-1 text-indigo-300">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

interface ConsignerTableProps {
  rows: ConsignerRow[];
  showDmo?: boolean;
  hideDistrictColumns?: boolean;
  consigneeLinkBase?: '/khanan/consignee' | '/khanan/consigner';
  sortKey?: ConsignerSortKey | null;
  sortDir?: ConsignerSortDir;
  onSort?: (key: ConsignerSortKey) => void;
  compact?: boolean;
  /** Preserve epass filters when linking to consignee page */
  linkSearchParams?: URLSearchParams;
}

export function ConsignerTable({
  rows,
  showDmo = false,
  hideDistrictColumns = false,
  consigneeLinkBase = '/khanan/consignee',
  sortKey = null,
  sortDir = 'asc',
  onSort,
  compact = false,
  linkSearchParams,
}: ConsignerTableProps) {
  const showDistrictCols = showDmo && !hideDistrictColumns;
  const sortable = Boolean(onSort);

  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No consigners found</p>
      </Card>
    );
  }

  function SortHeader({
    label,
    columnKey,
    align,
  }: {
    label: string;
    columnKey: ConsignerSortKey;
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

  const maxHeight = compact ? undefined : 'max-h-[calc(100vh-320px)]';

  return (
    <Card className="overflow-hidden p-0">
      <div className={`${maxHeight ?? ''} overflow-auto scrollbar-thin`.trim()}>
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface-primary">
            <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
              {showDistrictCols ? (
                <SortHeader label="DMO" columnKey="district" />
              ) : null}
              {showDistrictCols ? <SortHeader label="Operator" columnKey="operator" /> : null}
              <SortHeader label="Sl" columnKey="slNo" />
              <SortHeader label="Consigner" columnKey="consigner" />
              <SortHeader label="Mineral" columnKey="mineral" />
              <th className="px-4 py-3">Type</th>
              <SortHeader label="Challan lines" columnKey="challans" align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const consigneeHref =
                consigneeLinkBase === '/khanan/consignee' && linkSearchParams
                  ? buildConsigneeHref(row.id, linkSearchParams)
                  : consigneeLinkBase === '/khanan/consignee'
                    ? `${consigneeLinkBase}?consignerRowId=${row.id}`
                    : `${consigneeLinkBase}/${row.id}/challans`;

              return (
                <tr
                  key={row.id}
                  className="border-b border-border-default/60 transition hover:bg-indigo-500/5"
                >
                  {showDistrictCols && hasDmo(row) ? (
                    <>
                      <td className="px-4 py-2.5 font-medium text-white">{row.dmoName}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {formatOperatorType(row.operatorType ?? row.role)}
                      </td>
                    </>
                  ) : null}
                  <td className="px-4 py-2.5 tabular-nums text-text-secondary">{row.slNo}</td>
                  <td className="px-4 py-2.5 font-medium text-white">{row.consignerName}</td>
                  <td className="px-4 py-2.5">{row.mineral ?? '—'}</td>
                  <td className="px-4 py-2.5">{row.mineralType ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.challanCount > 0 ? (
                      <Link
                        href={consigneeHref}
                        className="font-medium text-indigo-300 underline-offset-2 hover:underline"
                      >
                        {formatInt(row.challanCount)}
                      </Link>
                    ) : (
                      <span className="tabular-nums text-text-secondary">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
