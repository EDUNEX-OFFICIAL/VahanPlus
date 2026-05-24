/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Record<string, unknown>} report
 * @param {string} [jobId]
 */
export async function persistEpassReport(prisma, report, jobId) {
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const scrapedAt = new Date(String(report.scrapedAt ?? new Date().toISOString()));

  const snapshot = await prisma.epassSnapshot.create({
    data: {
      reportDate: String(report.reportDate ?? 'unknown'),
      reportGeneratedOn: String(report.reportGeneratedOn ?? 'unknown'),
      sourceUrl: String(report.sourceUrl ?? ''),
      scrapedAt,
      jobId: jobId ?? null,
      rows: {
        create: rows.map((row) => ({
          slNo: Number(row.slNo),
          dmoName: String(row.dmoName),
          dmoId: row.dmoId != null ? String(row.dmoId) : null,
          lesseeMineral: row.lessee?.mineral ?? null,
          lesseeUsers: Number(row.lessee?.users ?? 0),
          lesseePasses: Number(row.lessee?.passes ?? 0),
          lesseeDispatchedQty: Number(row.lessee?.dispatchedQty ?? 0),
          dealerMineral: row.dealer?.mineral ?? null,
          dealerUsers: Number(row.dealer?.users ?? 0),
          dealerPasses: Number(row.dealer?.passes ?? 0),
          dealerDispatchedQty: Number(row.dealer?.dispatchedQty ?? 0),
          totalUsers: Number(row.total?.users ?? 0),
          totalPasses: Number(row.total?.passes ?? 0),
          lesseeMineralId: row.lesseeMineralId != null ? String(row.lesseeMineralId) : null,
          dealerMineralId: row.dealerMineralId != null ? String(row.dealerMineralId) : null,
          lesseePassDetailUrl:
            row.lesseePassDetailUrl != null ? String(row.lesseePassDetailUrl) : null,
          dealerPassDetailUrl:
            row.dealerPassDetailUrl != null ? String(row.dealerPassDetailUrl) : null,
        })),
      },
    },
    include: { rows: true },
  });

  return { snapshotId: snapshot.id, rowCount: snapshot.rows.length };
}
