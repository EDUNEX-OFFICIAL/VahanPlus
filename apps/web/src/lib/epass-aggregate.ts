import type {
  EpassDistrictRowDto,
  MineralAggregateRow,
  MineralRoleStats,
  OperatorTypeFilter,
} from '@/lib/epass-types';

function emptyStats(): MineralRoleStats {
  return { users: 0, passes: 0, dispatchedQty: 0 };
}

function addStats(target: MineralRoleStats, row: MineralRoleStats) {
  target.users += row.users;
  target.passes += row.passes;
  target.dispatchedQty += row.dispatchedQty;
}

export function aggregateMinerals(
  rows: EpassDistrictRowDto[],
  operator: OperatorTypeFilter = 'all',
): MineralAggregateRow[] {
  const map = new Map<string, MineralAggregateRow>();

  function getOrCreate(mineral: string): MineralAggregateRow {
    let entry = map.get(mineral);
    if (!entry) {
      entry = {
        mineral,
        lessee: emptyStats(),
        dealer: emptyStats(),
        totalPasses: 0,
      };
      map.set(mineral, entry);
    }
    return entry;
  }

  for (const row of rows) {
    if (operator !== 'dealer' && row.lesseeMineral) {
      const entry = getOrCreate(row.lesseeMineral);
      addStats(entry.lessee, {
        users: row.lesseeUsers,
        passes: row.lesseePasses,
        dispatchedQty: row.lesseeDispatchedQty,
      });
      entry.totalPasses += row.lesseePasses;
    }
    if (operator !== 'lessee' && row.dealerMineral) {
      const entry = getOrCreate(row.dealerMineral);
      addStats(entry.dealer, {
        users: row.dealerUsers,
        passes: row.dealerPasses,
        dispatchedQty: row.dealerDispatchedQty,
      });
      entry.totalPasses += row.dealerPasses;
    }
  }

  return [...map.values()].sort((a, b) => b.totalPasses - a.totalPasses);
}

export function formatQty(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInt(value: number): string {
  return value.toLocaleString('en-IN');
}
