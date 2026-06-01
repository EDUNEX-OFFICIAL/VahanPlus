'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Chip } from '@/components/ui/Chip';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import type {
  EpassVehicleStatusListItemDto,
  VehicleStatusSortDir,
  VehicleStatusSortKey,
} from '@/lib/epass-types';

function SortIndicator({
  columnKey,
  sortKey,
  sortDir,
}: {
  columnKey: VehicleStatusSortKey;
  sortKey: VehicleStatusSortKey | null;
  sortDir: VehicleStatusSortDir;
}) {
  if (sortKey !== columnKey) {
    return <span className="ml-1 text-text-secondary/40">↕</span>;
  }
  return <span className="ml-1 text-indigo-300">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function formatWeight(value: number | null): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

interface VehicleStatusTableProps {
  rows: EpassVehicleStatusListItemDto[];
  sortKey?: VehicleStatusSortKey | null;
  sortDir?: VehicleStatusSortDir;
  onSort?: (key: VehicleStatusSortKey) => void;
}

export function VehicleStatusTable({
  rows,
  sortKey = null,
  sortDir = 'asc',
  onSort,
}: VehicleStatusTableProps) {
  const sortable = Boolean(onSort);

  if (rows.length === 0) {
    return <EmptyStateCard message="No vehicle status records found" />;
  }

  function SortHeader({
    label,
    columnKey,
    align,
  }: {
    label: string;
    columnKey: VehicleStatusSortKey;
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
            key={row.id}
            eyebrow={row.ksRegNo ?? 'KS NA'}
            title={
              <Link
                href={`/khanan/vehicle-data?q=${encodeURIComponent(row.vehicleRegNo)}`}
                className="hover:text-indigo-200 hover:underline"
              >
                {row.vehicleRegNo}
              </Link>
            }
            subtitle={row.vehicleClass ?? 'Vehicle class NA'}
            meta={
              <>
                <Chip tone={row.found ? 'emerald' : 'amber'}>
                  {row.found ? 'Found' : 'Not found'}
                </Chip>
                <Chip tone="indigo">{row.esimValidity ?? 'ESIM NA'}</Chip>
              </>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <DataField label="RC Fit" value={row.rcFitUpTo ?? '—'} />
              <DataField label="Insurance" value={row.insuranceUpTo ?? '—'} />
              <DataField label="Gross WT" value={formatWeight(row.grossWeightMt)} />
              <DataField label="Unladen WT" value={formatWeight(row.unladenWeightMt)} />
              <DataField className="col-span-2" label="IMEI" value={row.imeiNo ?? '—'} />
            </div>
          </MobileDataCard>
        ))}
      </div>
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="max-h-[min(68vh,760px)] overflow-auto overscroll-contain scrollbar-thin">
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-primary">
              <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
                <SortHeader label="KS Reg No" columnKey="ksRegNo" />
                <SortHeader label="Vehicle Reg No" columnKey="vehicleRegNo" />
                <SortHeader label="Vehicle Class" columnKey="vehicleClass" />
                <SortHeader label="Rc Fit Up To" columnKey="rcFitUpTo" />
                <SortHeader label="Rc Tax Up To" columnKey="rcTaxUpTo" />
                <SortHeader label="Insurance Upto" columnKey="insuranceUpTo" />
                <SortHeader label="PUCC Upto" columnKey="puccUpTo" />
                <SortHeader label="IMEI No" columnKey="imeiNo" />
                <SortHeader label="ESIM Validity" columnKey="esimValidity" />
                <SortHeader label="Gross Wt (MT)" columnKey="grossWeightMt" align="right" />
                <SortHeader label="Unladen Wt (MT)" columnKey="unladenWeightMt" align="right" />
                <SortHeader label="Scraped" columnKey="scrapedAt" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border-default/60 ${row.found ? '' : 'opacity-60'}`}
                >
                  <td className="px-4 py-2.5 font-mono text-sm text-indigo-200">
                    {row.ksRegNo ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-white">
                    <Link
                      href={`/khanan/vehicle-data?q=${encodeURIComponent(row.vehicleRegNo)}`}
                      className="hover:text-indigo-200 hover:underline"
                    >
                      {row.vehicleRegNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-white">{row.vehicleClass ?? '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.rcFitUpTo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.rcTaxUpTo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.insuranceUpTo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.puccUpTo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-white">{row.imeiNo ?? '—'}</td>
                  <td className="px-4 py-2.5 text-white">{row.esimValidity ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatWeight(row.grossWeightMt)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatWeight(row.unladenWeightMt)}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {new Date(row.scrapedAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
