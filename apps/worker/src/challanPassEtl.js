import { normalizeVehicleRegNo } from './normalizeVrn.js';

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Record<string, unknown>} report
 */
export async function persistChallanPassReport(prisma, report) {
  const challanRowId = String(report.challanRowId ?? '');
  const rows = Array.isArray(report.rows) ? report.rows : [];

  const parent = await prisma.epassChallanRow.findUnique({
    where: { id: challanRowId },
    select: { consigneeName: true },
  });
  const parentConsigneeName = parent?.consigneeName?.trim() || null;

  await prisma.epassChallanPassRow.deleteMany({
    where: { challanRowId },
  });

  const scrapedAt = new Date(String(report.scrapedAt ?? new Date().toISOString()));

  const created = await prisma.epassChallanPassRow.createMany({
    data: rows.map((row) => ({
      challanRowId,
      slNo: Number(row.slNo),
      consigneeName: parentConsigneeName || String(row.consigneeName),
      challanNo: String(row.challanNo),
      portalPassId: row.portalPassId != null ? String(row.portalPassId) : null,
      mineral: row.mineral != null ? String(row.mineral) : null,
      mineralCategory: row.mineralCategory != null ? String(row.mineralCategory) : null,
      vehicleRegNo:
        row.vehicleRegNo != null ? normalizeVehicleRegNo(String(row.vehicleRegNo)) : null,
      destination: row.destination != null ? String(row.destination) : null,
      transportedDate: row.transportedDate != null ? String(row.transportedDate) : null,
      quantity: Number(row.quantity ?? 0),
      unit: row.unit != null ? String(row.unit) : null,
      checkStatus: row.checkStatus != null ? String(row.checkStatus) : null,
      portalChallanUrl: row.portalChallanUrl != null ? String(row.portalChallanUrl) : null,
      scrapedAt,
    })),
  });

  return { rowCount: created.count };
}
