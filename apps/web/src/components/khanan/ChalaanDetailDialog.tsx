'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { formatQty } from '@/lib/epass-aggregate';
import { formatOperatorType } from '@/lib/operator';
import type { EpassChalaanPassListItemDto } from '@/lib/epass-types';

interface ChalaanDetailDialogProps {
  row: EpassChalaanPassListItemDto | null;
  open: boolean;
  onClose: () => void;
}

function formatScrapedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DetailField({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border-default/60 bg-surface-deep/50 px-3 py-2.5 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm leading-snug font-medium text-white">{value}</p>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function ChalaanDetailDialog({ row, open, onClose }: ChalaanDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleNativeClose = () => {
      onCloseRef.current();
    };
    el.addEventListener('close', handleNativeClose);
    return () => el.removeEventListener('close', handleNativeClose);
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && row) {
      if (!el.open) {
        el.showModal();
      }
      return;
    }

    if (el.open) {
      el.close();
    }
  }, [open, row?.id]);

  const operatorLabel = row ? formatOperatorType(row.operatorType ?? row.role) : '';
  const portalUrl = row ? (row.summaryDetailUrl ?? row.portalChallanUrl) : null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={row ? 'chalaan-detail-title' : undefined}
      aria-hidden={!open}
      className="chalaan-detail-dialog overflow-hidden rounded-2xl border border-border-default bg-surface-primary text-white shadow-2xl ring-1 ring-white/10"
    >
      {row ? (
        <>
          <div className="relative border-b border-border-default bg-gradient-to-r from-indigo-500/10 via-surface-primary to-surface-primary px-5 py-4 pr-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
              Challan
            </p>
            <h2 id="chalaan-detail-title" className="mt-1 font-mono text-lg font-semibold text-white">
              {row.challanNo}
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              {row.consigneeName} · {row.dmoName} · {operatorLabel}
            </p>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-3 rounded-lg p-2 text-text-secondary transition hover:bg-surface-deep hover:text-white"
              onClick={() => dialogRef.current?.close()}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto p-5 scrollbar-thin">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Sl" value={String(row.slNo)} />
              <DetailField label="Consignee" value={row.consigneeName} wide />
              <DetailField label="Challan no" value={row.challanNo} wide />
              <DetailField label="Mineral" value={row.mineral ?? '—'} wide />
              <DetailField label="Category" value={row.mineralCategory ?? '—'} />
              <DetailField label="Vehicle" value={row.vehicleRegNo ?? '—'} />
              <DetailField label="Destination" value={row.destination ?? '—'} />
              <DetailField label="Transported date" value={row.transportedDate ?? '—'} />
              <DetailField
                label="Qty"
                value={`${formatQty(row.quantity)} ${row.unit ?? ''}`.trim()}
              />
              <DetailField label="Status" value={row.checkStatus ?? '—'} />
              <DetailField label="Scraped at" value={formatScrapedAt(row.scrapedAt)} wide />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-default bg-surface-deep/30 px-5 py-4">
            {portalUrl ? (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-auto inline-flex min-h-10 items-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
              >
                Portal detail
              </a>
            ) : null}
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </Button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}
