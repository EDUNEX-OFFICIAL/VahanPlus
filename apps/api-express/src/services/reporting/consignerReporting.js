import {
  applyConsignerNameFilter,
  normalizeConsignerFilterQuery,
} from '../../lib/epass-query-normalize.js';
import { isReportDateInRange } from '../../utils/epassDates.js';
import { resolvePageParams } from './cursor.js';

function mapConsignerSummary(row) {
  return {
    id: row.sourceRowId ?? row.id,
    districtRowId: row.districtRowId,
    snapshotId: row.lastSnapshotId,
    operatorType: row.operatorType,
    role: row.operatorType,
    slNo: row.slNo,
    consignerName: row.consignerName,
    mineral: row.mineral,
    mineralType: row.mineralType,
    challanCount: row.challanCount,
    challanDetailUrl: row.challanDetailUrl,
    scrapedAt: row.lastScrapedAt.toISOString(),
    challanLineCount: row.challanLineCount,
    ghatNumber: row.ghatNumber,
    ghatChallanId: row.sourceRowId ?? row.id,
    dmoName: row.dmoName,
    districtSlNo: row.districtSlNo,
  };
}

function buildConsignerWhere(query) {
  const where = {};
  const operatorType = query.operator ?? query.role;
  if (operatorType === 'lessee' || operatorType === 'dealer') {
    where.operatorType = operatorType;
  }
  const consigner = normalizeConsignerFilterQuery(query.consigner);
  if (consigner) {
    applyConsignerNameFilter(where, consigner);
  }
  const districts =
    typeof query.districts === 'string' ? query.districts.split(',').filter(Boolean) : [];
  if (districts.length === 1) {
    where.dmoName = { equals: districts[0], mode: 'insensitive' };
  } else if (districts.length > 1) {
    where.dmoName = { in: districts, mode: 'insensitive' };
  }
  const minerals =
    typeof query.minerals === 'string' ? query.minerals.split(',').filter(Boolean) : [];
  if (minerals.length === 1) {
    where.mineral = { equals: minerals[0], mode: 'insensitive' };
  } else if (minerals.length > 1) {
    where.OR = minerals.map((m) => ({ mineral: { equals: m, mode: 'insensitive' } }));
  }
  if (query.hideZeroChallans === '1' || query.hideZeroChallans === 'true') {
    where.challanCount = { gt: 0 };
  }
  return where;
}

function sortConsigners(items, query) {
  const dir = query.dir === 'desc' ? -1 : 1;
  const sort = typeof query.sort === 'string' ? query.sort : 'district';
  return [...items].sort((a, b) => {
    let av;
    let bv;
    switch (sort) {
      case 'consigner':
        av = a.consignerName;
        bv = b.consignerName;
        break;
      case 'mineral':
        av = a.mineral ?? '';
        bv = b.mineral ?? '';
        break;
      case 'role':
      case 'operator':
        av = a.operatorType;
        bv = b.operatorType;
        break;
      case 'challans':
        av = a.challanCount;
        bv = b.challanCount;
        return (av - bv) * dir;
      case 'slNo':
        av = a.slNo;
        bv = b.slNo;
        return (av - bv) * dir;
      default:
        av = a.dmoName;
        bv = b.dmoName;
    }
    const cmp = String(av).localeCompare(String(bv), 'en', { numeric: true });
    if (cmp !== 0) return cmp * dir;
    return (a.slNo - b.slNo) * dir;
  });
}

export async function fetchConsignerList(prisma, query) {
  const { limit, offset } = resolvePageParams(query);
  const where = buildConsignerWhere(query);

  let rows = await prisma.reportConsignerSummary.findMany({ where });

  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : '';
  if (query.dateMode === 'range' && (dateFrom || dateTo)) {
    rows = rows.filter((r) =>
      isReportDateInRange(r.lastReportDate, dateFrom || null, dateTo || null),
    );
  }

  const mapped = sortConsigners(rows.map(mapConsignerSummary), query);
  const total = mapped.length;
  const items = mapped.slice(offset, offset + limit);

  const latest = await prisma.reportConsignerSummary.findFirst({
    orderBy: { lastScrapedAt: 'desc' },
    select: { lastScrapedAt: true },
  });

  return {
    snapshot: null,
    reportScope: 'all',
    entityCount: total,
    snapshotCount: total,
    snapshotsTruncated: false,
    latestScrapedAt: latest?.lastScrapedAt?.toISOString() ?? null,
    total,
    limit,
    offset,
    items,
  };
}

export async function fetchConsignerOptions(prisma, query) {
  const where = buildConsignerWhere(query);
  let rows = await prisma.reportConsignerSummary.findMany({
    where,
    orderBy: [{ dmoName: 'asc' }, { operatorType: 'asc' }, { consignerName: 'asc' }],
    take: 500,
  });

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
      consignerName: r.consignerName,
      operatorType: r.operatorType,
      dmoName: r.dmoName,
      mineral: r.mineral,
      scrapedAt: r.lastScrapedAt.toISOString(),
    })),
  };
}
