'use client';

import { useCallback, useState } from 'react';
import { VehicleDataDetailDialog } from '@/components/khanan/VehicleDataDetailDialog';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatVehicleDataPreview, formatVehicleDataQty } from '@/lib/epass-vehicle-data-view';
import type {
  VehicleDataListItemDto,
  VehicleDataListParams,
  VehicleDataSortDir,
  VehicleDataSortKey,
} from '@/lib/epass-types';

function formatWeight(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SortIndicator({
  columnKey,
  sortKey,
  sortDir,
}: {
  columnKey: VehicleDataSortKey;
  sortKey: VehicleDataSortKey | null;
  sortDir: VehicleDataSortDir;
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

interface VehicleDataTableProps {
  rows: VehicleDataListItemDto[];
  sortKey?: VehicleDataSortKey | null;
  sortDir?: VehicleDataSortDir;
  onSort?: (key: VehicleDataSortKey) => void;
  detailQueryParams: Omit<VehicleDataListParams, 'limit' | 'offset' | 'sort' | 'dir'>;
}

export function VehicleDataTable({
  rows,
  sortKey = null,
  sortDir = 'asc',
  onSort,
  detailQueryParams,
}: VehicleDataTableProps) {
  const sortable = Boolean(onSort);
  const [selectedVrn, setSelectedVrn] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = useCallback((row: VehicleDataListItemDto) => {
    setSelectedVrn(row.vehicleRegNo);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedVrn(null);
  }, []);

  if (rows.length === 0) {
    return <EmptyStateCard message="No vehicle data found" />;
  }

  function SortHeader({
    label,
    columnKey,
    align,
  }: {
    label: string;
    columnKey: VehicleDataSortKey;
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
        {rows.map((row) => (
          <MobileDataCard
            key={row.vehicleRegNo}
            eyebrow={`${row.passCount} pass${row.passCount === 1 ? '' : 'es'}`}
            title={row.vehicleRegNo}
            subtitle={formatVehicleDataPreview(row.dmoNames)}
            meta={
              <>
                <Chip tone="indigo">{formatVehicleDataPreview(row.minerals, 1)}</Chip>
                {row.hasVehicleStatus ? <Chip tone="cyan">Status</Chip> : null}
              </>
            }
            action={
              <button
                type="button"
                onClick={() => openDetail(row)}
                className="inline-flex min-h-10 items-center rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3 text-xs font-bold text-indigo-100"
              >
                View
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <DataField label="Consigner" value={formatVehicleDataPreview(row.consignerNames)} />
              <DataField
                label="Qty"
                value={formatVehicleDataQty(row.totalQuantity, row.quantityByUnit)}
              />
              <DataField label="GVW (MT)" value={formatWeight(row.grossWeightMt)} />
              <DataField label="Unladen (MT)" value={formatWeight(row.unladenWeightMt)} />
              <DataField label="Last date" value={row.lastTransportedDate ?? '—'} />
              <DataField label="Destination" value={formatVehicleDataPreview(row.destinations)} />
            </div>
          </MobileDataCard>
        ))}
      </div>
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="max-h-[min(68vh,760px)] overflow-auto overscroll-contain scrollbar-thin">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-primary">
              <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
                <SortHeader label="Vehicle" columnKey="vehicle" />
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Consigner</th>
                <th className="px-4 py-3">Mineral</th>
                <SortHeader label="Qty" columnKey="qty" align="right" />
                <SortHeader label="Passes" columnKey="passes" align="right" />
                <SortHeader label="GVW (MT)" columnKey="grossWeight" align="right" />
                <SortHeader label="Unladen (MT)" columnKey="unladen" align="right" />
                <SortHeader label="Last date" columnKey="lastDate" />
                <th className="w-12 px-2 py-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.vehicleRegNo}
                  className="cursor-pointer border-b border-border-default/60 transition hover:bg-indigo-500/5"
                  onClick={() => openDetail(row)}
                >
                  <td className="px-4 py-2.5 font-mono text-sm text-white">
                    <span className="inline-flex items-center gap-2">
                      {row.vehicleRegNo}
                      {row.hasVehicleStatus ? (
                        <Chip tone="cyan" className="text-[10px]">
                          Status
                        </Chip>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white">
                    {formatVehicleDataPreview(row.dmoNames)}
                  </td>
                  <td className="px-4 py-2.5 text-white">
                    {formatVehicleDataPreview(row.consignerNames)}
                  </td>
                  <td className="px-4 py-2.5 text-white">
                    {formatVehicleDataPreview(row.minerals)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white">
                    {formatVehicleDataQty(row.totalQuantity, row.quantityByUnit)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">
                    {row.passCount}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">
                    {formatWeight(row.grossWeightMt)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">
                    {formatWeight(row.unladenWeightMt)}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {row.lastTransportedDate ?? '—'}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      type="button"
                      aria-label="View vehicle"
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
      <VehicleDataDetailDialog
        vehicleRegNo={selectedVrn}
        open={detailOpen}
        onClose={closeDetail}
        detailQueryParams={detailQueryParams}
      />
    </>
  );
}
