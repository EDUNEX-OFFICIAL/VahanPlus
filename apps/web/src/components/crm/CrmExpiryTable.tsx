'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatDateDmy, normalizeReportDate } from '@/lib/epass-report-date';
import { daysLeftTone, formatDaysLeft } from '@/lib/crm-expiry-view';
import { RC_ADVANCE_CRM_COLUMNS } from '@vahanplus/rc-advance-client';
import type { CrmExpirySortKey, CrmVehicleExpiryListItemDto } from '@/lib/crm-types';
import type { VehicleStatusSortDir } from '@/lib/epass-types';

function SortIndicator({
  columnKey,
  sortKey,
  sortDir,
}: {
  columnKey: CrmExpirySortKey;
  sortKey: CrmExpirySortKey | null;
  sortDir: VehicleStatusSortDir;
}) {
  if (sortKey !== columnKey) {
    return <span className="ml-1 text-text-secondary/40">↕</span>;
  }
  return <span className="ml-1 text-indigo-300">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function sourceLabel(source: CrmVehicleExpiryListItemDto['crmSource']): string {
  if (source === 'both') return 'Auto + Manual';
  if (source === 'manual') return 'Manual';
  return 'Auto';
}

function formatRcAdvanceCell(value: string | number | boolean | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function formatScrapedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDateDmy(d);
}

function DaysLeftCell({ value }: { value: number | null }) {
  return <span className={`tabular-nums ${daysLeftTone(value)}`}>{formatDaysLeft(value)}</span>;
}

function sourceTone(
  source: CrmVehicleExpiryListItemDto['crmSource'],
): 'indigo' | 'emerald' | 'amber' {
  if (source === 'manual') return 'emerald';
  if (source === 'both') return 'amber';
  return 'indigo';
}

interface CrmExpiryTableProps {
  rows: CrmVehicleExpiryListItemDto[];
  sortKey?: CrmExpirySortKey | null;
  sortDir?: VehicleStatusSortDir;
  onSort?: (key: CrmExpirySortKey) => void;
  selected: Set<string>;
  onToggleRow: (vehicleRegNo: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  onRemove: (vehicleRegNo: string) => void;
  removingRegNo?: string | null;
  showRemove?: boolean;
}

export function CrmExpiryTable({
  rows,
  sortKey = null,
  sortDir = 'asc',
  onSort,
  selected,
  onToggleRow,
  onToggleAll,
  allSelected,
  onRemove,
  removingRegNo = null,
  showRemove = true,
}: CrmExpiryTableProps) {
  const sortable = Boolean(onSort);
  const showSelection = showRemove;

  if (rows.length === 0) {
    return <EmptyStateCard message="No vehicles in queue" />;
  }

  function SortHeader({
    label,
    columnKey,
    align,
  }: {
    label: string;
    columnKey: CrmExpirySortKey;
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
                <Chip tone={sourceTone(row.crmSource)}>{sourceLabel(row.crmSource)}</Chip>
                <Chip tone={row.found ? 'emerald' : 'amber'}>
                  {row.found ? 'On portal' : 'No data'}
                </Chip>
              </>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <DataField
                label="Insurance days"
                value={<DaysLeftCell value={row.insuranceDaysLeft} />}
              />
              <DataField label="RC days" value={<DaysLeftCell value={row.rcDaysLeft} />} />
              <DataField
                label="Fitness days"
                value={<DaysLeftCell value={row.fitnessDaysLeft} />}
              />
              <DataField
                label="Owner"
                value={formatRcAdvanceCell(row.rcAdvance?.owner_name as string | null)}
              />
              <DataField
                label="Mobile"
                value={formatRcAdvanceCell(row.rcAdvance?.mobile_no as string | number | null)}
              />
              <DataField
                label="Insurance (RC)"
                value={formatRcAdvanceCell(
                  row.rcAdvance?.insurance_insurance_upto as string | null,
                )}
              />
              <DataField
                label="Fit (RC)"
                value={formatRcAdvanceCell(row.rcAdvance?.fit_upto as string | null)}
              />
            </div>
            {showSelection ? (
              <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={selected.has(row.vehicleRegNo)}
                  onChange={() => onToggleRow(row.vehicleRegNo)}
                />
                Select for bulk remove
              </label>
            ) : null}
            {showRemove ? (
              <Button
                variant="secondary"
                className="mt-3 w-full text-sm"
                disabled={removingRegNo === row.vehicleRegNo}
                onClick={() => onRemove(row.vehicleRegNo)}
              >
                Remove
              </Button>
            ) : null}
          </MobileDataCard>
        ))}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="max-h-[min(68vh,760px)] overflow-auto overscroll-contain scrollbar-thin">
          <table className="w-full min-w-[5200px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-primary">
              <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-secondary">
                {showSelection ? (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={onToggleAll}
                      aria-label="Select all on page"
                    />
                  </th>
                ) : null}
                <th className="px-4 py-3">S.No.</th>
                <SortHeader label="Source" columnKey="crmSource" />
                <SortHeader label="KS Reg No" columnKey="ksRegNo" />
                <SortHeader label="Vehicle Reg No" columnKey="vehicleRegNo" />
                <SortHeader label="Vehicle Class" columnKey="vehicleClass" />
                <SortHeader label="Insurance Days" columnKey="insuranceDaysLeft" align="right" />
                <SortHeader label="RC Days" columnKey="rcDaysLeft" align="right" />
                <SortHeader label="Fitness Days" columnKey="fitnessDaysLeft" align="right" />
                <SortHeader label="Rc Fit Up To" columnKey="rcFitUpTo" />
                <SortHeader label="Insurance Upto" columnKey="insuranceUpTo" />
                <SortHeader label="Rc Tax Up To" columnKey="rcTaxUpTo" />
                <SortHeader label="Scraped" columnKey="scrapedAt" />
                {RC_ADVANCE_CRM_COLUMNS.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 whitespace-nowrap">
                    {label}
                  </th>
                ))}
                {showRemove ? <th className="px-4 py-3">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.vehicleRegNo}
                  className={`border-b border-border-default/60 ${row.found ? '' : 'opacity-60'}`}
                >
                  {showSelection ? (
                    <td className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(row.vehicleRegNo)}
                        onChange={() => onToggleRow(row.vehicleRegNo)}
                        aria-label={`Select ${row.vehicleRegNo}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-2.5 tabular-nums text-text-secondary">{index + 1}</td>
                  <td className="px-4 py-2.5">
                    <Chip tone={sourceTone(row.crmSource)}>{sourceLabel(row.crmSource)}</Chip>
                  </td>
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
                  <td className="px-4 py-2.5 text-right">
                    <DaysLeftCell value={row.insuranceDaysLeft} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DaysLeftCell value={row.rcDaysLeft} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DaysLeftCell value={row.fitnessDaysLeft} />
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {row.rcFitUpTo ? normalizeReportDate(row.rcFitUpTo) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {row.insuranceUpTo ? normalizeReportDate(row.insuranceUpTo) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {row.rcTaxUpTo ? normalizeReportDate(row.rcTaxUpTo) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {formatScrapedAt(row.scrapedAt)}
                  </td>
                  {RC_ADVANCE_CRM_COLUMNS.map(({ key }) => (
                    <td key={key} className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                      {formatRcAdvanceCell(
                        row.rcAdvance?.[key] as string | number | boolean | null | undefined,
                      )}
                    </td>
                  ))}
                  {showRemove ? (
                    <td className="px-4 py-2.5">
                      <Button
                        variant="secondary"
                        className="text-xs"
                        disabled={removingRegNo === row.vehicleRegNo}
                        onClick={() => onRemove(row.vehicleRegNo)}
                      >
                        Remove
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
