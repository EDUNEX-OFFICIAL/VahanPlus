/**

 * @param {import('@vahan360/db').PrismaClient} prisma

 * @param {Record<string, unknown>} report

 */

export async function persistConsignerReport(prisma, report) {

  const districtRowId = String(report.districtRowId ?? '');

  const snapshotId = String(report.snapshotId ?? '');

  const operatorType = String(report.operatorType ?? report.role ?? 'lessee');

  const rows = Array.isArray(report.rows) ? report.rows : [];



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



  return { rowCount: created.count, consignerRows: saved };

}

