'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { enqueueVehicleStatusScrape } from '@/lib/epass';
import { formatVehicleDataPreview, formatVehicleDataQty } from '@/lib/epass-vehicle-data-view';
import { mcvPortalStatusChipTone, mcvPortalStatusLabel } from '@/lib/mcv-portal-status';
import type {
  McvPortalStatus,
  VehicleDataListItemDto,
  VehicleDataSortDir,
  VehicleDataSortKey,
} from '@/lib/epass-types';

function PortalStatusChip({ status }: { status: McvPortalStatus }) {
  return (
    <Chip tone={mcvPortalStatusChipTone(status)} className="text-[10px]">
      {mcvPortalStatusLabel(status)}
    </Chip>
  );
}

function resolveMcvPortalStatus(row: VehicleDataListItemDto): McvPortalStatus {
  return row.mcvPortalStatus ?? (row.hasVehicleStatus ? 'on_portal' : 'not_checked');
}

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

function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

interface VehicleDataTableProps {
  rows: VehicleDataListItemDto[];
  sortKey?: VehicleDataSortKey | null;
  sortDir?: VehicleDataSortDir;
  onSort?: (key: VehicleDataSortKey) => void;
  onOpenDetail: (vehicleRegNo: string) => void;
}

export function VehicleDataTable({
  rows,
  sortKey = null,
  sortDir = 'asc',
  onSort,
  onOpenDetail,
}: VehicleDataTableProps) {
  const queryClient = useQueryClient();
  const sortable = Boolean(onSort);
  const [queuedVrns, setQueuedVrns] = useState<Set<string>>(new Set());

  const [enqueueError, setEnqueueError] = useState<string | null>(null);

  const enqueueMutation = useMutation({
    mutationFn: (vehicleRegNo: string) => enqueueVehicleStatusScrape(vehicleRegNo),
    onMutate: () => setEnqueueError(null),
    onSuccess: (result, vehicleRegNo) => {
      if (result.skipped) {
        setEnqueueError('MCV status scrape is disabled in Khanan Config.');
        return;
      }
      if (result.enqueued === 0 && (result.skippedExisting ?? 0) > 0) {
        setEnqueueError('Status already exists for this VRN — refresh the table.');
        void queryClient.invalidateQueries({ queryKey: ['epass', 'vehicle-data'] });
        return;
      }
      setQueuedVrns((prev) => new Set(prev).add(vehicleRegNo));
      void queryClient.invalidateQueries({ queryKey: ['epass', 'vehicle-data'] });
    },
    onError: () => setEnqueueError('Could not queue portal check. Try again.'),
  });

  const handleCheckStatus = useCallback(
    (vehicleRegNo: string) => {
      enqueueMutation.mutate(vehicleRegNo);
    },
    [enqueueMutation],
  );

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

  function CheckStatusButton({ vehicleRegNo }: { vehicleRegNo: string }) {
    const isQueued = queuedVrns.has(vehicleRegNo);
    const isPending = enqueueMutation.isPending && enqueueMutation.variables === vehicleRegNo;

    return (
      <button
        type="button"
        aria-label={isQueued ? 'Portal check queued' : 'Check portal status'}
        title={isQueued ? 'Queued — refresh shortly' : 'Check portal status'}
        disabled={isPending || isQueued}
        className="inline-flex rounded-lg p-2 text-text-secondary transition hover:bg-surface-deep hover:text-cyan-300 disabled:opacity-50"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          handleCheckStatus(vehicleRegNo);
        }}
      >
        <RefreshIcon className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <>
      {enqueueError ? (
        <p className="text-xs text-amber-200/90" role="status">
          {enqueueError}
        </p>
      ) : null}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const portalStatus = resolveMcvPortalStatus(row);
          return (
            <MobileDataCard
              key={row.vehicleRegNo}
              eyebrow={`${row.passCount} pass${row.passCount === 1 ? '' : 'es'}`}
              title={row.vehicleRegNo}
              subtitle={formatVehicleDataPreview(row.dmoNames)}
              meta={
                <>
                  <Chip tone="indigo">{formatVehicleDataPreview(row.minerals, 1)}</Chip>
                  <PortalStatusChip status={portalStatus} />
                </>
              }
              action={
                <div className="flex items-center gap-2">
                  {portalStatus === 'not_checked' ? (
                    <CheckStatusButton vehicleRegNo={row.vehicleRegNo} />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpenDetail(row.vehicleRegNo)}
                    className="inline-flex min-h-10 items-center rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3 text-xs font-bold text-indigo-100"
                  >
                    View
                  </button>
                </div>
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
          );
        })}
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
                <th className="px-4 py-3">Portal status</th>
                <SortHeader label="GVW (MT)" columnKey="grossWeight" align="right" />
                <SortHeader label="Unladen (MT)" columnKey="unladen" align="right" />
                <SortHeader label="Last date" columnKey="lastDate" />
                <th className="w-20 px-2 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const portalStatus = resolveMcvPortalStatus(row);
                return (
                  <tr
                    key={row.vehicleRegNo}
                    className="cursor-pointer border-b border-border-default/60 transition hover:bg-indigo-500/5"
                    onClick={() => onOpenDetail(row.vehicleRegNo)}
                  >
                    <td className="px-4 py-2.5 font-mono text-sm text-white">
                      <span className="font-mono">{row.vehicleRegNo}</span>
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
                    <td className="px-4 py-2.5">
                      <PortalStatusChip status={portalStatus} />
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
                      <div className="inline-flex items-center gap-0.5">
                        {portalStatus === 'not_checked' ? (
                          <CheckStatusButton vehicleRegNo={row.vehicleRegNo} />
                        ) : null}
                        <button
                          type="button"
                          aria-label="View vehicle"
                          className="inline-flex rounded-lg p-2 text-text-secondary transition hover:bg-surface-deep hover:text-indigo-300"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetail(row.vehicleRegNo);
                          }}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
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
