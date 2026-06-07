import { normalizeConsigneeFilterQuery } from '../../lib/epass-query-normalize.js';
import { isReportDateInRange } from '../../utils/epassDates.js';

function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

export async function fetchConsigneeChallans(prisma, consignerRowId, query) {
  const consigner = await prisma.epassConsignerRow.findUnique({
    where: { id: consignerRowId },
    include: { districtRow: { include: { snapshot: true } } },
  });

  if (!consigner) {
    return { items: [], consigner: null };
  }

  let rows = await prisma.reportConsigneeSummary.findMany({
    where: { consignerRowId },
    orderBy: [{ slNo: 'asc' }],
  });

  const consignee = normalizeConsigneeFilterQuery(query.consignee);
  if (consignee) {
    rows = rows.filter((r) => r.consigneeName.toLowerCase().includes(consignee.toLowerCase()));
  }
  if (query.hideZeroPasses === '1' || query.hideZeroPasses === 'true') {
    rows = rows.filter((r) => r.challanCount > 0);
  }

  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : '';
  if (query.dateMode === 'range' && (dateFrom || dateTo)) {
    rows = rows.filter((r) =>
      isReportDateInRange(r.lastReportDate, dateFrom || null, dateTo || null),
    );
  }

  return {
    items: rows.map((r) => ({
      id: r.sourceRowId ?? r.id,
      consignerRowId: r.consignerRowId,
      slNo: r.slNo,
      reportDate: r.lastReportDate,
      consigneeName: r.consigneeName,
      mineral: r.mineral,
      mineralCategory: r.mineralCategory,
      challanCount: r.challanCount,
      storedPassCount: 0,
      scrapeComplete: true,
      dispatchedQty: toNumber(r.dispatchedQty),
      unit: r.unit,
      ghatNumber: r.ghatNumber ?? null,
      operatorType: r.operatorType,
      detailUrl: null,
      scrapedAt: r.lastScrapedAt.toISOString(),
    })),
    consigner,
    districtRow: {
      dmoName: consigner.districtRow.dmoName,
      slNo: consigner.districtRow.slNo,
    },
    snapshot: { reportDate: consigner.districtRow.snapshot.reportDate },
    truncated: false,
    incompleteScrape: false,
  };
}
