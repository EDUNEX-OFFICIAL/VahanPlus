'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/Alert';
import { AdaptiveDialog } from '@/components/ui/AdaptiveDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataErrorCard } from '@/components/ui/DataErrorCard';
import { fetchVehicleDataDetail } from '@/lib/epass';
import { formatQty } from '@/lib/epass-aggregate';
import { formatVehicleDataPreview, formatVehicleDataQty } from '@/lib/epass-vehicle-data-view';
import { formatOperatorType } from '@/lib/operator';
import type { VehicleDataListParams } from '@/lib/epass-types';

interface VehicleDataDetailDialogProps {
  vehicleRegNo: string | null;
  open: boolean;
  onClose: () => void;
  detailQueryParams: Omit<VehicleDataListParams, 'limit' | 'offset' | 'sort' | 'dir'>;
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

function formatScrapedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatWeight(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

export function VehicleDataDetailDialog({
  vehicleRegNo,
  open,
  onClose,
  detailQueryParams,
}: VehicleDataDetailDialogProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['epass', 'vehicle-data-detail', vehicleRegNo, detailQueryParams],
    queryFn: () => {
      if (!vehicleRegNo) throw new Error('Vehicle required');
      return fetchVehicleDataDetail(vehicleRegNo, detailQueryParams);
    },
    enabled: open && Boolean(vehicleRegNo),
  });

  if (!vehicleRegNo) return null;

  const summary = data?.summary;
  const status = data?.vehicleStatus;
  const statusHref = `/khanan/vehicle-status?q=${encodeURIComponent(vehicleRegNo)}`;

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      eyebrow="Vehicle"
      title={<span className="font-mono">{vehicleRegNo}</span>}
      subtitle={
        summary
          ? `${summary.passCount} pass${summary.passCount === 1 ? '' : 'es'} · ${formatVehicleDataPreview(summary.dmoNames, 3)}`
          : undefined
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href={statusHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20 sm:mr-auto"
          >
            Vehicle status
          </Link>
          <Button variant="secondary" className="text-sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <Card className="animate-pulse p-8">
          <div className="h-24 rounded bg-surface-deep" />
        </Card>
      ) : null}

      {isError ? <DataErrorCard onRetry={() => refetch()} /> : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-6">
          {summary ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Passes" value={String(summary.passCount)} />
              <DetailField
                label="Qty"
                value={formatVehicleDataQty(summary.totalQuantity, summary.quantityByUnit)}
              />
              <DetailField
                label="Minerals"
                value={formatVehicleDataPreview(summary.minerals, 20)}
                wide
              />
              <DetailField
                label="Districts"
                value={formatVehicleDataPreview(summary.dmoNames, 20)}
                wide
              />
              <DetailField
                label="Consigners"
                value={formatVehicleDataPreview(summary.consignerNames, 20)}
                wide
              />
              <DetailField
                label="Destinations"
                value={formatVehicleDataPreview(summary.destinations, 20)}
                wide
              />
              <DetailField label="Last transported" value={summary.lastTransportedDate ?? '—'} />
              <DetailField
                label="Last scraped"
                value={summary.lastScrapedAt ? formatScrapedAt(summary.lastScrapedAt) : '—'}
              />
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              MCV portal status
            </p>
            {status?.found ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailField label="KS reg no" value={status.ksRegNo ?? '—'} />
                <DetailField label="Class" value={status.vehicleClass ?? '—'} />
                <DetailField label="RC fit up to" value={status.rcFitUpTo ?? '—'} />
                <DetailField label="RC tax up to" value={status.rcTaxUpTo ?? '—'} />
                <DetailField label="Insurance up to" value={status.insuranceUpTo ?? '—'} />
                <DetailField label="PUCC up to" value={status.puccUpTo ?? '—'} />
                <DetailField label="IMEI" value={status.imeiNo ?? '—'} />
                <DetailField label="eSIM validity" value={status.esimValidity ?? '—'} />
                <DetailField label="Gross weight (MT)" value={formatWeight(status.grossWeightMt)} />
                <DetailField
                  label="Unladen weight (MT)"
                  value={formatWeight(status.unladenWeightMt)}
                />
                <DetailField label="Scraped at" value={formatScrapedAt(status.scrapedAt)} wide />
              </div>
            ) : status && !status.found ? (
              <Alert type="info">
                MCV scrape ran for this registration, but the Bihar portal returned no status data
                (not on portal or empty response). Pass import data is still shown below.
              </Alert>
            ) : (
              <Alert type="info">
                Portal status not checked yet for this VRN. Run MCV scrape from Khanan Config, use
                Import option &quot;Queue MCV status scrape&quot;, or open Vehicle Status after
                scrape.
              </Alert>
            )}
          </div>

          {data.passes.length > 0 ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Pass lines
              </p>
              <div className="max-h-64 overflow-auto rounded-xl border border-border-default/60 scrollbar-thin">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-surface-deep">
                    <tr className="border-b border-border-default text-text-secondary">
                      <th className="px-3 py-2">Challan</th>
                      <th className="px-3 py-2">Consignee</th>
                      <th className="px-3 py-2">Mineral</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2">Destination</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">District</th>
                      <th className="px-3 py-2">Consigner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.passes.map((pass) => (
                      <tr key={pass.id} className="border-b border-border-default/40 text-white">
                        <td className="px-3 py-2 font-mono text-indigo-200">
                          {pass.portalChallanUrl ? (
                            <a
                              href={pass.portalChallanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {pass.challanNo}
                            </a>
                          ) : (
                            pass.challanNo
                          )}
                        </td>
                        <td className="px-3 py-2">{pass.consigneeName}</td>
                        <td className="px-3 py-2">{pass.mineral ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {`${formatQty(pass.quantity)} ${pass.unit ?? ''}`.trim()}
                        </td>
                        <td className="px-3 py-2">{pass.destination ?? '—'}</td>
                        <td className="px-3 py-2 text-text-secondary">
                          {pass.transportedDate ?? '—'}
                        </td>
                        <td className="px-3 py-2">{pass.dmoName}</td>
                        <td className="px-3 py-2">
                          {pass.consignerName}
                          <span className="ml-1 text-text-secondary">
                            ({formatOperatorType(pass.operatorType ?? pass.role)})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </AdaptiveDialog>
  );
}
