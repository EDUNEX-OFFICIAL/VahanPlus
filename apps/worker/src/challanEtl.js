/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {Record<string, unknown>} report
 */
export async function persistChallanReport(prisma, report) {
  const consignerRowId = String(report.consignerRowId ?? '');
  const rows = Array.isArray(report.rows) ? report.rows : [];

  await prisma.epassChallanRow.deleteMany({
    where: { consignerRowId },
  });

  const created = await prisma.epassChallanRow.createMany({
    data: rows.map((row) => ({
      consignerRowId,
      slNo: Number(row.slNo),
      consigneeName: String(row.consigneeName),
      mineral: row.mineral != null ? String(row.mineral) : null,
      mineralCategory: row.mineralCategory != null ? String(row.mineralCategory) : null,
      challanCount: Number(row.challanCount ?? 0),
      dispatchedQty: Number(row.dispatchedQty ?? 0),
      unit: row.unit != null ? String(row.unit) : null,
      detailUrl: row.detailUrl != null ? String(row.detailUrl) : null,
      scrapedAt: new Date(String(report.scrapedAt ?? new Date().toISOString())),
    })),
  });

  const saved = await prisma.epassChallanRow.findMany({
    where: { consignerRowId },
    orderBy: { slNo: 'asc' },
  });

  return { rowCount: created.count, challanRows: saved };
}
