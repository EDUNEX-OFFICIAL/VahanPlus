'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChalaanDetailDialog } from '@/components/khanan/ChalaanDetailDialog';
import { Card } from '@/components/ui/Card';
import { formatQty } from '@/lib/epass-aggregate';
import type {
  ChalaanSortDir,
  ChalaanSortKey,
  EpassChalaanPassListItemDto,
} from '@/lib/epass-types';

function SortIndicator({
  columnKey,
  sortKey,
  sortDir,
}: {
  columnKey: ChalaanSortKey;
  sortKey: ChalaanSortKey | null;
  sortDir: ChalaanSortDir;
}) {
  if (sortKey !== columnKey) {
    return <span className="ml-1 text-text-secondary/40">↕</span>;
  }
  return <span className="ml-1 text-indigo-300">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

interface ChalaanTableProps {
  rows: EpassChalaanPassListItemDto[];
  sortKey?: ChalaanSortKey | null;
  sortDir?: ChalaanSortDir;
  onSort?: (key: ChalaanSortKey) => void;
}

export function ChalaanTable({
  rows,
  sortKey = null,
  sortDir = 'asc',
  onSort,
}: ChalaanTableProps) {
  const sortable = Boolean(onSort);
  const [selectedRow, setSelectedRow] = useState<EpassChalaanPassListItemDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const selectedRowIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!detailOpen || !selectedRowIdRef.current) return;
    const stillOnPage = rows.some((r) => r.id === selectedRowIdRef.current);
    if (!stillOnPage) {
      selectedRowIdRef.current = null;
      setSelectedRow(null);
      setDetailOpen(false);
    }
  }, [rows, detailOpen]);

  const openDetail = useCallback((row: EpassChalaanPassListItemDto) => {
    selectedRowIdRef.current = row.id;
    setSelectedRow(row);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    selectedRowIdRef.current = null;
    setSelectedRow(null);
  }, []);

  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No challan lines found</p>
      </Card>
    );
  }

  function SortHeader({
    label,
    columnKey,
    align,
  }: {
    label: string;
    columnKey: ChalaanSortKey;
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
    <>
      <Card className="overflow-hidden p-0">
        <div className="max-h-[calc(100vh-360px)] overflow-auto scrollbar-thin">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-primary">
              <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
                <SortHeader label="Sl" columnKey="slNo" />
                <SortHeader label="Challan no" columnKey="challanNo" />
                <SortHeader label="Mineral" columnKey="mineral" />
                <th className="px-4 py-3">Category</th>
                <SortHeader label="Vehicle" columnKey="vehicle" />
                <SortHeader label="Destination" columnKey="destination" />
                <SortHeader label="Date" columnKey="date" />
                <SortHeader label="Qty" columnKey="qty" align="right" />
                <th className="px-4 py-3">Unit</th>
                <SortHeader label="Status" columnKey="status" />
                <th className="w-12 px-2 py-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-border-default/60 transition hover:bg-indigo-500/5"
                  onClick={() => openDetail(row)}
                >
                  <td className="px-4 py-2.5 tabular-nums text-text-secondary">{row.slNo}</td>
                  <td className="px-4 py-2.5 font-mono text-sm text-indigo-200">
                    {row.portalChallanUrl ? (
                      <a
                        href={row.portalChallanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {row.challanNo}
                      </a>
                    ) : (
                      row.challanNo
                    )}
                  </td>
                  <td className="px-4 py-2.5">{row.mineral ?? '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.mineralCategory ?? '—'}</td>
                  <td className="px-4 py-2.5 text-white">{row.vehicleRegNo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-white">{row.destination ?? '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.transportedDate ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatQty(row.quantity)}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.unit ?? '—'}</td>
                  <td className="px-4 py-2.5 text-white">{row.checkStatus ?? '—'}</td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      type="button"
                      aria-label="View challan"
                      className="inline-flex rounded-lg p-2 text-text-secondary transition hover:bg-surface-deep hover:text-indigo-300"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(row);
                      }}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ChalaanDetailDialog row={selectedRow} open={detailOpen} onClose={closeDetail} />
    </>
  );
}
