'use client';

import { AdaptiveDialog } from '@/components/ui/AdaptiveDialog';
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

function DetailField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
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

export function ChalaanDetailDialog({ row, open, onClose }: ChalaanDetailDialogProps) {
  const operatorLabel = row ? formatOperatorType(row.operatorType ?? row.role) : '';
  const portalUrl = row ? (row.summaryDetailUrl ?? row.portalChallanUrl) : null;

  if (!row) return null;

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      eyebrow="Challan"
      title={<span className="font-mono">{row.challanNo}</span>}
      subtitle={`${row.consigneeName} · ${row.dmoName} · ${operatorLabel}`}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {portalUrl ? (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20 sm:mr-auto"
            >
              Portal detail
            </a>
          ) : null}
          <Button variant="secondary" className="text-sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Sl" value={String(row.slNo)} />
        <DetailField label="Consignee" value={row.consigneeName} wide />
        <DetailField label="Challan no" value={row.challanNo} wide />
        <DetailField label="Mineral" value={row.mineral ?? '—'} wide />
        <DetailField label="Category" value={row.mineralCategory ?? '—'} />
        <DetailField label="Vehicle" value={row.vehicleRegNo ?? '—'} />
        <DetailField label="Destination" value={row.destination ?? '—'} />
        <DetailField label="Transported date" value={row.transportedDate ?? '—'} />
        <DetailField label="Qty" value={`${formatQty(row.quantity)} ${row.unit ?? ''}`.trim()} />
        <DetailField label="Status" value={row.checkStatus ?? '—'} />
        <DetailField label="Scraped at" value={formatScrapedAt(row.scrapedAt)} wide />
      </div>
    </AdaptiveDialog>
  );
}
