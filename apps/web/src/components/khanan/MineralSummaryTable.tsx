import { Chip } from '@/components/ui/Chip';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { Card } from '@/components/ui/Card';
import { DataField, MobileDataCard } from '@/components/ui/MobileDataCard';
import { formatInt, formatQty } from '@/lib/epass-aggregate';
import { operatorShowsDealer, operatorShowsLessee } from '@/lib/epass-mineral-view';
import type { MineralAggregateRow, OperatorTypeFilter } from '@/lib/epass-types';

interface MineralSummaryTableProps {
  minerals: MineralAggregateRow[];
  operatorFilter?: OperatorTypeFilter;
  districtCount?: number;
  allReportsHint?: boolean;
}

export function MineralSummaryTable({
  minerals,
  operatorFilter = 'all',
  districtCount,
  allReportsHint = false,
}: MineralSummaryTableProps) {
  const showLessee = operatorShowsLessee(operatorFilter);
  const showDealer = operatorShowsDealer(operatorFilter);

  if (minerals.length === 0) {
    return <EmptyStateCard message="No mineral rows found" />;
  }

  const footer = minerals.reduce(
    (acc, row) => {
      acc.lesseeUsers += row.lessee.users;
      acc.lesseePasses += row.lessee.passes;
      acc.lesseeQty += row.lessee.dispatchedQty;
      acc.dealerUsers += row.dealer.users;
      acc.dealerPasses += row.dealer.passes;
      acc.dealerQty += row.dealer.dispatchedQty;
      acc.totalPasses += row.totalPasses;
      return acc;
    },
    {
      lesseeUsers: 0,
      lesseePasses: 0,
      lesseeQty: 0,
      dealerUsers: 0,
      dealerPasses: 0,
      dealerQty: 0,
      totalPasses: 0,
    },
  );

  const contextLine =
    districtCount != null
      ? `Showing ${minerals.length} mineral${minerals.length === 1 ? '' : 's'} from ${districtCount} district${districtCount === 1 ? '' : 's'}`
      : `Showing ${minerals.length} mineral${minerals.length === 1 ? '' : 's'}`;

  const footerCard = (
    <Card>
      <div className="flex flex-wrap gap-6 text-sm">
        {showLessee ? (
          <>
            <p className="tabular-nums text-text-secondary">
              Total Lessee Users:{' '}
              <span className="font-semibold text-white">{formatInt(footer.lesseeUsers)}</span>
            </p>
            <p className="tabular-nums text-text-secondary">
              Total Lessee Passes:{' '}
              <span className="font-semibold text-white">{formatInt(footer.lesseePasses)}</span>
            </p>
            <p className="tabular-nums text-text-secondary">
              Total Lessee Quantity:{' '}
              <span className="font-semibold text-white">{formatQty(footer.lesseeQty)}</span>
            </p>
          </>
        ) : null}
        {showDealer ? (
          <>
            <p className="tabular-nums text-text-secondary">
              Total Dealer Users:{' '}
              <span className="font-semibold text-white">{formatInt(footer.dealerUsers)}</span>
            </p>
            <p className="tabular-nums text-text-secondary">
              Total Dealer Passes:{' '}
              <span className="font-semibold text-white">{formatInt(footer.dealerPasses)}</span>
            </p>
            <p className="tabular-nums text-text-secondary">
              Total Dealer Quantity:{' '}
              <span className="font-semibold text-white">{formatQty(footer.dealerQty)}</span>
            </p>
          </>
        ) : null}
        <p className="tabular-nums text-text-secondary">
          Total Passes:{' '}
          <span className="font-semibold text-white">{formatInt(footer.totalPasses)}</span>
        </p>
      </div>
    </Card>
  );

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs text-text-secondary tabular-nums">{contextLine}</p>
        {allReportsHint ? (
          <p className="text-xs text-text-secondary/80">
            Totals reflect each district&apos;s latest report, not a single day&apos;s snapshot.
          </p>
        ) : null}
      </div>

      <div className="space-y-3 md:hidden">
        {minerals.map((row) => (
          <MobileDataCard
            key={row.mineral}
            eyebrow="Mineral"
            title={row.mineral}
            meta={<Chip tone="indigo">{formatInt(row.totalPasses)} total passes</Chip>}
          >
            <div className="grid gap-2">
              {showLessee ? (
                <div className="grid grid-cols-3 gap-2">
                  <DataField label="Lessee users" value={formatInt(row.lessee.users)} />
                  <DataField label="Passes" value={formatInt(row.lessee.passes)} />
                  <DataField label="Qty" value={formatQty(row.lessee.dispatchedQty)} />
                </div>
              ) : null}
              {showDealer ? (
                <div className="grid grid-cols-3 gap-2">
                  <DataField label="Dealer users" value={formatInt(row.dealer.users)} />
                  <DataField label="Passes" value={formatInt(row.dealer.passes)} />
                  <DataField label="Qty" value={formatQty(row.dealer.dispatchedQty)} />
                </div>
              ) : null}
            </div>
          </MobileDataCard>
        ))}
        {footerCard}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-primary text-xs uppercase tracking-wider text-text-secondary">
                <th className="px-4 py-3 font-semibold">Mineral</th>
                {showLessee ? (
                  <>
                    <th className="border-l border-border-default px-3 py-3 font-semibold">
                      Lessee users
                    </th>
                    <th className="px-3 py-3 font-semibold">Lessee passes</th>
                    <th className="px-3 py-3 font-semibold">Lessee qty</th>
                  </>
                ) : null}
                {showDealer ? (
                  <>
                    <th className="border-l border-border-default px-3 py-3 font-semibold">
                      Dealer users
                    </th>
                    <th className="px-3 py-3 font-semibold">Dealer passes</th>
                    <th className="px-3 py-3 font-semibold">Dealer qty</th>
                  </>
                ) : null}
                <th className="border-l border-border-default px-3 py-3 font-semibold">
                  Total passes
                </th>
              </tr>
            </thead>
            <tbody>
              {minerals.map((row) => (
                <tr
                  key={row.mineral}
                  className="border-b border-border-default/60 hover:bg-indigo-500/5"
                >
                  <td className="px-4 py-3 font-semibold text-white">{row.mineral}</td>
                  {showLessee ? (
                    <>
                      <td className="border-l border-border-default/40 px-3 py-3 tabular-nums">
                        {formatInt(row.lessee.users)}
                      </td>
                      <td className="px-3 py-3 tabular-nums font-medium text-indigo-300">
                        {formatInt(row.lessee.passes)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatQty(row.lessee.dispatchedQty)}
                      </td>
                    </>
                  ) : null}
                  {showDealer ? (
                    <>
                      <td className="border-l border-border-default/40 px-3 py-3 tabular-nums">
                        {formatInt(row.dealer.users)}
                      </td>
                      <td className="px-3 py-3 tabular-nums font-medium text-emerald-300">
                        {formatInt(row.dealer.passes)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatQty(row.dealer.dispatchedQty)}
                      </td>
                    </>
                  ) : null}
                  <td className="border-l border-border-default/40 px-3 py-3 tabular-nums font-semibold text-white">
                    {formatInt(row.totalPasses)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="hidden md:block">{footerCard}</div>
    </>
  );
}
