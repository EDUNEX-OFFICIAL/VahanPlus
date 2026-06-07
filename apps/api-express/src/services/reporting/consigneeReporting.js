import {
  normalizeConsigneeFilterQuery,
  normalizeConsignerFilterQuery,
} from '../../lib/epass-query-normalize.js';
import { isReportDateInRange } from '../../utils/epassDates.js';
import { parseCsvQueryParam } from './queryParams.js';

function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

export function buildConsigneeSummaryBrowseWhere(query) {
  const where = {};
  const operatorType = query.operator ?? query.role;
  if (operatorType === 'lessee' || operatorType === 'dealer') {
    where.operatorType = operatorType;
  }
  const districts = parseCsvQueryParam(query, 'district', 'districts', 'dmo');
  if (districts.length === 1) {
    where.dmoName = { equals: districts[0], mode: 'insensitive' };
  } else if (districts.length > 1) {
    where.dmoName = { in: districts, mode: 'insensitive' };
  }
  const consigner = normalizeConsignerFilterQuery(query.consigner);
  if (consigner) {
    where.consignerName = { contains: consigner, mode: 'insensitive' };
  }
  const minerals = parseCsvQueryParam(query, 'mineral', 'minerals');
  if (minerals.length === 1) {
    where.mineral = { equals: minerals[0], mode: 'insensitive' };
  } else if (minerals.length > 1) {
    where.OR = minerals.map((m) => ({ mineral: { equals: m, mode: 'insensitive' } }));
  }
  return where;
}

export function filterRowsByReportDateRange(rows, query) {
  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : '';
  if (query.dateMode !== 'range' || (!dateFrom && !dateTo)) {
    return rows;
  }
  return rows.filter((r) =>
    isReportDateInRange(r.lastReportDate, dateFrom || null, dateTo || null),
  );
}

function filterRowsByMinerals(rows, query) {
  const minerals = parseCsvQueryParam(query, 'mineral', 'minerals');
  if (minerals.length === 0) return rows;
  const set = new Set(minerals.map((m) => m.toLowerCase()));
  return rows.filter((r) => set.has((r.mineral ?? '').toLowerCase()));
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

  rows = filterRowsByMinerals(rows, query);

  const consignee = normalizeConsigneeFilterQuery(query.consignee);
  if (consignee) {
    rows = rows.filter((r) => r.consigneeName.toLowerCase().includes(consignee.toLowerCase()));
  }
  if (query.hideZeroPasses === '1' || query.hideZeroPasses === 'true') {
    rows = rows.filter((r) => r.challanCount > 0);
  }

  rows = filterRowsByReportDateRange(rows, query);

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
