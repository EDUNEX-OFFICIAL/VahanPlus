/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Array<{ id: string; reportDate: string; scrapedAt: Date; sourceUrl?: string | null; _count: { rows: number } }>} snapshots
 */
export async function buildSnapshotLiveRows(prisma, snapshots) {
  if (!snapshots.length) return [];

  const snapshotIds = snapshots.map((s) => s.id);
  const consignerGroups =
    snapshotIds.length > 0
      ? await prisma.epassConsignerRow.groupBy({
          by: ['snapshotId'],
          where: { snapshotId: { in: snapshotIds } },
          _count: { _all: true },
        })
      : [];

  const consignerBySnapshot = Object.fromEntries(
    consignerGroups.map((g) => [g.snapshotId, g._count._all]),
  );

  const challanGroups =
    snapshotIds.length > 0
      ? await prisma.epassChallanRow.groupBy({
          by: ['consignerRowId'],
          where: { consignerRow: { snapshotId: { in: snapshotIds } } },
          _count: { _all: true },
        })
      : [];

  const consignerSnapshotMap = new Map();
  if (snapshotIds.length > 0) {
    const consigners = await prisma.epassConsignerRow.findMany({
      where: { snapshotId: { in: snapshotIds } },
      select: { id: true, snapshotId: true },
    });
    for (const c of consigners) {
      consignerSnapshotMap.set(c.id, c.snapshotId);
    }
  }

  const challanBySnapshot = {};
  for (const g of challanGroups) {
    const snapId = consignerSnapshotMap.get(g.consignerRowId);
    if (!snapId) continue;
    challanBySnapshot[snapId] = (challanBySnapshot[snapId] ?? 0) + g._count._all;
  }

  const passGroups =
    snapshotIds.length > 0
      ? await prisma.epassChallanPassRow.groupBy({
          by: ['challanRowId'],
          where: {
            challanRow: { consignerRow: { snapshotId: { in: snapshotIds } } },
          },
          _count: { _all: true },
        })
      : [];

  const challanConsignerMap = new Map();
  if (snapshotIds.length > 0) {
    const challans = await prisma.epassChallanRow.findMany({
      where: { consignerRow: { snapshotId: { in: snapshotIds } } },
      select: { id: true, consignerRowId: true },
    });
    for (const ch of challans) {
      challanConsignerMap.set(ch.id, ch.consignerRowId);
    }
  }

  const passBySnapshot = {};
  for (const g of passGroups) {
    const consignerId = challanConsignerMap.get(g.challanRowId);
    const snapId = consignerId ? consignerSnapshotMap.get(consignerId) : null;
    if (!snapId) continue;
    passBySnapshot[snapId] = (passBySnapshot[snapId] ?? 0) + g._count._all;
  }

  const reportDateGroups = new Map();
  for (const s of snapshots) {
    const list = reportDateGroups.get(s.reportDate) ?? [];
    list.push(s);
    reportDateGroups.set(s.reportDate, list);
  }

  return snapshots.map((s) => ({
    id: s.id,
    reportDate: s.reportDate,
    scrapedAt: s.scrapedAt.toISOString(),
    sourceUrl: s.sourceUrl ?? null,
    districtRows: s._count.rows,
    consignerRows: consignerBySnapshot[s.id] ?? 0,
    challanRows: challanBySnapshot[s.id] ?? 0,
    passRows: passBySnapshot[s.id] ?? 0,
    snapshotCountForDate: reportDateGroups.get(s.reportDate)?.length ?? 1,
  }));
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} snapshotId
 */
export async function snapshotRowCounts(prisma, snapshotId) {
  const snap = await prisma.epassSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      reportDate: true,
      scrapedAt: true,
      sourceUrl: true,
      _count: { select: { rows: true } },
    },
  });
  if (!snap) return null;
  const rows = await buildSnapshotLiveRows(prisma, [snap]);
  const row = rows[0];
  if (!row) return null;
  return {
    districtRows: row.districtRows,
    consignerRows: row.consignerRows,
    challanRows: row.challanRows,
    passRows: row.passRows,
  };
}
