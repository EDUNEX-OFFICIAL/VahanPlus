/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Record<string, unknown>} report
 */
export async function persistConsignerReport(prisma, report) {
  const districtRowId = String(report.districtRowId ?? '');
  const snapshotId = String(report.snapshotId ?? '');
  const operatorType = String(report.operatorType ?? report.role ?? 'lessee');
  const rows = Array.isArray(report.rows) ? report.rows : [];

  const existing = await prisma.epassConsignerRow.findMany({
    where: { districtRowId, operatorType },
    select: { slNo: true, consignerName: true, ghatNumber: true },
  });

  const ghatByKey = new Map();
  for (const row of existing) {
    const g = row.ghatNumber?.trim();
    if (g) {
      ghatByKey.set(consignerGhatKey(row.slNo, row.consignerName), g);
    }
  }

  await prisma.epassConsignerRow.deleteMany({
    where: { districtRowId, operatorType },
  });

  const created = await prisma.epassConsignerRow.createMany({
    data: rows.map((row) => ({
      districtRowId,
      snapshotId,
      operatorType,
      slNo: Number(row.slNo),
      consignerName: String(row.consignerName),
      mineral: row.mineral != null ? String(row.mineral) : null,
      mineralType: row.mineralType != null ? String(row.mineralType) : null,
      challanCount: Number(row.challanCount ?? 0),
      challanDetailUrl: row.challanDetailUrl != null ? String(row.challanDetailUrl) : null,
      leaseId: row.leaseId != null ? String(row.leaseId) : null,
      mineralId: row.mineralId != null ? String(row.mineralId) : null,
      scrapedAt: new Date(String(report.scrapedAt ?? new Date().toISOString())),
    })),
  });

  const saved = await prisma.epassConsignerRow.findMany({
    where: { districtRowId, operatorType },
    orderBy: { slNo: 'asc' },
  });

  if (operatorType === 'lessee') {
    const districtRow = await prisma.epassDistrictRow.findUnique({
      where: { id: districtRowId },
      select: { dmoName: true },
    });
    const dmoName = districtRow?.dmoName ?? '';
    const priorByName = dmoName
      ? await loadPriorGhatByConsignerName(prisma, dmoName, operatorType, snapshotId)
      : new Map();

    for (const row of saved) {
      const key = consignerGhatKey(row.slNo, row.consignerName);
      let ghat = ghatByKey.get(key);
      if (!ghat) {
        ghat = priorByName.get(row.consignerName.trim().toLowerCase()) ?? null;
      }
      if (ghat) {
        await prisma.epassConsignerRow.update({
          where: { id: row.id },
          data: { ghatNumber: ghat },
        });
        row.ghatNumber = ghat;
      }
    }
  }

  return { rowCount: created.count, consignerRows: saved };
}

function consignerGhatKey(slNo, consignerName) {
  return `${Number(slNo)}|${String(consignerName).trim().toLowerCase()}`;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} dmoName
 * @param {string} operatorType
 * @param {string} currentSnapshotId
 * @returns {Promise<Map<string, string>>}
 */
async function loadPriorGhatByConsignerName(prisma, dmoName, operatorType, currentSnapshotId) {
  const prior = await prisma.epassConsignerRow.findMany({
    where: {
      operatorType,
      ghatNumber: { not: null },
      snapshotId: { not: currentSnapshotId },
      districtRow: { dmoName },
    },
    orderBy: { scrapedAt: 'desc' },
    select: { consignerName: true, ghatNumber: true },
  });

  const byName = new Map();
  for (const row of prior) {
    const nameKey = row.consignerName.trim().toLowerCase();
    if (byName.has(nameKey)) continue;
    const g = row.ghatNumber?.trim();
    if (g) byName.set(nameKey, g);
  }
  return byName;
}
