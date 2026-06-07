import { isReportDateInRange } from '../../utils/epassDates.js';
function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

function mapSummaryRow(row, consignerCounts = null) {
  const operators = {
    lessee: {
      mineral: row.lesseeMineral,
      users: row.lesseeUsers,
      passes: row.lesseePasses,
      dispatchedQty: toNumber(row.lesseeDispatchedQty),
      passDetailUrl: row.lesseePassDetailUrl ?? null,
    },
    dealer: {
      mineral: row.dealerMineral,
      users: row.dealerUsers,
      passes: row.dealerPasses,
      dispatchedQty: toNumber(row.dealerDispatchedQty),
      passDetailUrl: row.dealerPassDetailUrl ?? null,
    },
  };

  const base = {
    id: row.sourceRowId ?? row.id,
    snapshotId: row.lastSnapshotId,
    slNo: row.slNo,
    dmoName: row.dmoName,
    dmoId: row.dmoId,
    operators,
    lesseeMineral: row.lesseeMineral,
    lesseeUsers: row.lesseeUsers,
    lesseePasses: row.lesseePasses,
    lesseeDispatchedQty: toNumber(row.lesseeDispatchedQty),
    dealerMineral: row.dealerMineral,
    dealerUsers: row.dealerUsers,
    dealerPasses: row.dealerPasses,
    dealerDispatchedQty: toNumber(row.dealerDispatchedQty),
    totalUsers: row.totalUsers,
    totalPasses: row.totalPasses,
    lesseeMineralId: row.lesseeMineralId,
    dealerMineralId: row.dealerMineralId,
    lesseePassDetailUrl: row.lesseePassDetailUrl ?? null,
    dealerPassDetailUrl: row.dealerPassDetailUrl ?? null,
  };

  if (!consignerCounts || !row.sourceRowId) return base;

  const lessee = consignerCounts.get(`${row.sourceRowId}:lessee`) ?? { consigners: 0, challans: 0 };
  const dealer = consignerCounts.get(`${row.sourceRowId}:dealer`) ?? { consigners: 0, challans: 0 };

  const scrapeStatus = (expectedPasses, counts) => {
    if (expectedPasses <= 0) return 'n/a';
    if (counts.consigners === 0) return 'pending';
    if (counts.challanExpected > 0 && counts.challans < counts.challanExpected) return 'partial';
    return 'complete';
  };

  return {
    ...base,
    lesseeConsignerScrapeStatus: scrapeStatus(row.lesseePasses, lessee),
    dealerConsignerScrapeStatus: scrapeStatus(row.dealerPasses, dealer),
  };
}

function buildDistrictWhere(query) {
  const where = {};
  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : '';
  if (query.dateMode === 'range' && (dateFrom || dateTo)) {
    // Filter applied post-fetch via isReportDateInRange on lastReportDate
  }
  const districts =
    typeof query.districts === 'string' ? query.districts.split(',').filter(Boolean) : [];
  if (districts.length > 0) {
    where.dmoName = { in: districts, mode: 'insensitive' };
  }
  if (query.hideZeroPasses === '1' || query.hideZeroPasses === 'true') {
    where.totalPasses = { gt: 0 };
  }
  return where;
}

async function buildConsignerCountMap(prisma, districtRowIds) {
  const map = new Map();
  if (districtRowIds.length === 0) return map;

  const consigners = await prisma.epassConsignerRow.findMany({
    where: { districtRowId: { in: districtRowIds } },
    select: {
      districtRowId: true,
      operatorType: true,
      challanCount: true,
      _count: { select: { challans: true } },
    },
  });

  for (const c of consigners) {
    const key = `${c.districtRowId}:${c.operatorType}`;
    const prev = map.get(key) ?? { consigners: 0, challans: 0, challanExpected: 0 };
    prev.consigners += 1;
    prev.challans += c._count.challans;
    prev.challanExpected += c.challanCount;
    map.set(key, prev);
  }
  return map;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
export async function fetchDistrictBrowse(prisma, query) {
  const where = buildDistrictWhere(query);
  let rows = await prisma.reportDistrictSummary.findMany({
    where,
    orderBy: [{ slNo: 'asc' }, { dmoName: 'asc' }],
  });

  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : '';
  if (query.dateMode === 'range' && (dateFrom || dateTo)) {
    rows = rows.filter((r) =>
      isReportDateInRange(r.lastReportDate, dateFrom || null, dateTo || null),
    );
  }

  const operator = query.operator ?? query.role;
  if (operator === 'lessee' || operator === 'dealer') {
    rows = rows.filter((r) => (operator === 'lessee' ? r.lesseePasses : r.dealerPasses) > 0);
  }

  const minerals =
    typeof query.minerals === 'string' ? query.minerals.split(',').filter(Boolean) : [];
  if (minerals.length > 0) {
    const set = new Set(minerals.map((m) => m.toLowerCase()));
    rows = rows.filter((r) => {
      const lm = (r.lesseeMineral ?? '').toLowerCase();
      const dm = (r.dealerMineral ?? '').toLowerCase();
      return [...set].some((m) => lm.includes(m) || dm.includes(m));
    });
  }

  const latest = await prisma.reportDistrictSummary.findFirst({
    orderBy: { lastScrapedAt: 'desc' },
    select: { lastScrapedAt: true },
  });

  const sourceIds = rows.map((r) => r.sourceRowId).filter(Boolean);
  const consignerCounts = await buildConsignerCountMap(prisma, sourceIds);

  return {
    snapshot: null,
    reportScope: query.reportScope === 'range' ? 'range' : 'all',
    entityCount: rows.length,
    snapshotCount: rows.length,
    snapshotsTruncated: false,
    latestScrapedAt: latest?.lastScrapedAt?.toISOString() ?? null,
    rows: rows.map((r) => mapSummaryRow(r, consignerCounts)),
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
export async function fetchMineralBrowse(prisma, query) {
  const operator = query.operator ?? query.role;
  const where = {};
  if (operator === 'lessee' || operator === 'dealer') {
    where.operatorRole = operator;
  }

  const rawRows = await prisma.reportMineralSummary.findMany({
    where,
    orderBy: { passes: 'desc' },
  });

  const map = new Map();
  const empty = () => ({ users: 0, passes: 0, dispatchedQty: 0 });
  for (const r of rawRows) {
    let entry = map.get(r.mineral);
    if (!entry) {
      entry = { mineral: r.mineral, lessee: empty(), dealer: empty(), totalPasses: 0 };
      map.set(r.mineral, entry);
    }
    const stats = {
      users: r.users,
      passes: r.passes,
      dispatchedQty: toNumber(r.dispatchedQty),
    };
    if (r.operatorRole === 'lessee') entry.lessee = stats;
    else entry.dealer = stats;
    entry.totalPasses += r.passes;
  }

  let minerals = [...map.values()];
  const mineralFilter =
    typeof query.minerals === 'string' ? query.minerals.split(',').filter(Boolean) : [];
  if (mineralFilter.length > 0) {
    const set = new Set(mineralFilter.map((m) => m.toLowerCase()));
    minerals = minerals.filter((r) => set.has((r.mineral ?? '').toLowerCase()));
  }
  if (query.hideZeroPasses === '1' || query.hideZeroPasses === 'true') {
    minerals = minerals.filter((r) => r.totalPasses > 0);
  }
  minerals.sort((a, b) => b.totalPasses - a.totalPasses);

  const latest = await prisma.reportDistrictSummary.findFirst({
    orderBy: { lastScrapedAt: 'desc' },
    select: { lastScrapedAt: true },
  });

  return {
    reportScope: 'all',
    entityCount: minerals.length,
    snapshotCount: minerals.length,
    snapshotsTruncated: false,
    latestScrapedAt: latest?.lastScrapedAt?.toISOString() ?? null,
    minerals,
  };
}

export async function fetchFilterOptions(prisma) {
  const [districts, minerals, latest] = await Promise.all([
    prisma.reportDistrictSummary.findMany({ select: { dmoName: true }, distinct: ['dmoName'] }),
    prisma.reportMineralSummary.findMany({ select: { mineral: true }, distinct: ['mineral'] }),
    prisma.reportDistrictSummary.findFirst({
      orderBy: { lastScrapedAt: 'desc' },
      select: { lastScrapedAt: true },
    }),
  ]);

  return {
    districts: districts.map((d) => d.dmoName).sort((a, b) => a.localeCompare(b)),
    minerals: minerals.map((m) => m.mineral).sort((a, b) => a.localeCompare(b)),
    latestScrapedAt: latest?.lastScrapedAt?.toISOString() ?? null,
    entityCount: districts.length,
    snapshotCount: districts.length,
    snapshotsTruncated: false,
  };
}
