import { Card } from '@/components/ui/Card';
import { formatInt, formatQty } from '@/lib/epass-aggregate';
import type { MineralAggregateRow } from '@/lib/epass-types';

interface MineralSummaryTableProps {
  minerals: MineralAggregateRow[];
}

export function MineralSummaryTable({ minerals }: MineralSummaryTableProps) {
  if (minerals.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No data available</p>
      </Card>
    );
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

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-primary text-xs uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3 font-semibold" rowSpan={2}>
                Mineral
              </th>
              <th
                className="border-l border-border-default px-4 py-2 text-center font-semibold text-indigo-300"
                colSpan={3}
              >
                Operator (Lessee)
              </th>
              <th
                className="border-l border-border-default px-4 py-2 text-center font-semibold text-emerald-300"
                colSpan={3}
              >
                Operator (Dealer)
              </th>
              <th className="border-l border-border-default px-4 py-3 font-semibold" rowSpan={2}>
                Total passes
              </th>
            </tr>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-wider text-text-secondary">
              <th className="border-l border-border-default px-3 py-2">Users</th>
              <th className="px-3 py-2">Passes</th>
              <th className="px-3 py-2">Qty</th>
              <th className="border-l border-border-default px-3 py-2">Users</th>
              <th className="px-3 py-2">Passes</th>
              <th className="px-3 py-2">Qty</th>
            </tr>
          </thead>
          <tbody>
            {minerals.map((row) => (
              <tr
                key={row.mineral}
                className="border-b border-border-default/60 hover:bg-indigo-500/5"
              >
                <td className="px-4 py-3 font-semibold text-white">{row.mineral}</td>
                <td className="border-l border-border-default/40 px-3 py-3 tabular-nums">
                  {formatInt(row.lessee.users)}
                </td>
                <td className="px-3 py-3 tabular-nums font-medium text-indigo-300">
                  {formatInt(row.lessee.passes)}
                </td>
                <td className="px-3 py-3 tabular-nums">{formatQty(row.lessee.dispatchedQty)}</td>
                <td className="border-l border-border-default/40 px-3 py-3 tabular-nums">
                  {formatInt(row.dealer.users)}
                </td>
                <td className="px-3 py-3 tabular-nums font-medium text-emerald-300">
                  {formatInt(row.dealer.passes)}
                </td>
                <td className="px-3 py-3 tabular-nums">{formatQty(row.dealer.dispatchedQty)}</td>
                <td className="border-l border-border-default/40 px-3 py-3 tabular-nums font-semibold text-white">
                  {formatInt(row.totalPasses)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-deep/80 font-semibold text-white">
              <td className="px-4 py-3">All minerals</td>
              <td className="border-l border-border-default/40 px-3 py-3 tabular-nums">
                {formatInt(footer.lesseeUsers)}
              </td>
              <td className="px-3 py-3 tabular-nums text-indigo-300">
                {formatInt(footer.lesseePasses)}
              </td>
              <td className="px-3 py-3 tabular-nums">{formatQty(footer.lesseeQty)}</td>
              <td className="border-l border-border-default/40 px-3 py-3 tabular-nums">
                {formatInt(footer.dealerUsers)}
              </td>
              <td className="px-3 py-3 tabular-nums text-emerald-300">
                {formatInt(footer.dealerPasses)}
              </td>
              <td className="px-3 py-3 tabular-nums">{formatQty(footer.dealerQty)}</td>
              <td className="border-l border-border-default/40 px-3 py-3 tabular-nums">
                {formatInt(footer.totalPasses)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
