import { mineralEntityKey } from './semantics.js';

function toNum(v) {
  return v != null ? Number(v) : 0;
}

/**
 * Rebuild ReportMineralSummary from all ReportDistrictSummary rows.
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
export async function rebuildMineralSummary(prisma) {
  const districts = await prisma.reportDistrictSummary.findMany();
  const map = new Map();

  for (const row of districts) {
    if (row.lesseeMineral) {
      const key = mineralEntityKey(row.lesseeMineral, 'lessee');
      let e = map.get(key);
      if (!e) {
        e = {
          entityKey: key,
          mineral: row.lesseeMineral,
          operatorRole: 'lessee',
          users: 0,
          passes: 0,
          dispatchedQty: 0,
        };
        map.set(key, e);
      }
      e.users += row.lesseeUsers;
      e.passes += row.lesseePasses;
      e.dispatchedQty += toNum(row.lesseeDispatchedQty);
    }
    if (row.dealerMineral) {
      const key = mineralEntityKey(row.dealerMineral, 'dealer');
      let e = map.get(key);
      if (!e) {
        e = {
          entityKey: key,
          mineral: row.dealerMineral,
          operatorRole: 'dealer',
          users: 0,
          passes: 0,
          dispatchedQty: 0,
        };
        map.set(key, e);
      }
      e.users += row.dealerUsers;
      e.passes += row.dealerPasses;
      e.dispatchedQty += toNum(row.dealerDispatchedQty);
    }
  }

  await prisma.$transaction([
    prisma.reportMineralSummary.deleteMany(),
    ...[...map.values()].map((e) =>
      prisma.reportMineralSummary.create({
        data: {
          entityKey: e.entityKey,
          mineral: e.mineral,
          operatorRole: e.operatorRole,
          users: e.users,
          passes: e.passes,
          dispatchedQty: e.dispatchedQty,
          totalPasses: e.passes,
        },
      }),
    ),
  ]);

  return map.size;
}
