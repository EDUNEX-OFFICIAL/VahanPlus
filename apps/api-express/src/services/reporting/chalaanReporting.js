import { parseDateFlexible } from '../../utils/epassDates.js';
import { isReportDateInRange } from '../../utils/epassDates.js';
import { resolvePageParams } from './cursor.js';

function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

function formatDateDmy(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function mapPassRow(row) {
  return {
    id: row.sourceRowId ?? row.id,
    challanRowId: row.challanRowId,
    slNo: row.slNo,
    consigneeName: row.consigneeName,
    challanNo: row.challanNo,
    portalPassId: row.portalPassId,
    mineral: row.mineral,
    mineralCategory: row.mineralCategory,
    vehicleRegNo: row.vehicleRegNo,
    destination: row.destination,
    transportedDate: formatDateDmy(parseDateFlexible(row.transportedDate)) ?? row.transportedDate,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    checkStatus: row.checkStatus,
    portalChallanUrl: row.portalChallanUrl,
    scrapedAt: row.lastScrapedAt.toISOString(),
    dmoName: row.dmoName,
    consignerName: row.consignerName,
    operatorType: row.operatorType,
    reportDate: row.lastReportDate,
  };
}

function buildPassWhere(query) {
  const where = {};
  const operator = query.operator ?? query.role;
  if (operator === 'lessee' || operator === 'dealer') {
    where.operatorType = operator;
  }
  const districts =
    typeof query.districts === 'string' ? query.districts.split(',').filter(Boolean) : [];
  if (districts.length === 1) {
    where.dmoName = { equals: districts[0], mode: 'insensitive' };
  } else if (districts.length > 1) {
    where.dmoName = { in: districts, mode: 'insensitive' };
  }
  const consigner = typeof query.consigner === 'string' ? query.consigner.trim() : '';
  if (consigner) {
    where.consignerName = { contains: consigner, mode: 'insensitive' };
  }
  const consignee = typeof query.consignee === 'string' ? query.consignee.trim() : '';
  if (consignee) {
    where.consigneeName = { contains: consignee, mode: 'insensitive' };
  }
  const destination = typeof query.destination === 'string' ? query.destination.trim() : '';
  if (destination) {
    where.destination = { contains: destination, mode: 'insensitive' };
  }
  const challanNo = typeof query.challanNo === 'string' ? query.challanNo.trim() : '';
  if (challanNo) {
    where.challanNo = { contains: challanNo, mode: 'insensitive' };
  }
  const minerals =
    typeof query.minerals === 'string' ? query.minerals.split(',').filter(Boolean) : [];
  if (minerals.length > 0) {
    where.OR = minerals.map((m) => ({ mineral: { contains: m, mode: 'insensitive' } }));
  }
  if (query.hideZeroPasses === '1' || query.hideZeroPasses === 'true') {
    where.quantity = { gt: 0 };
  }
  return where;
}

function sortPasses(items, query) {
  const dir = query.dir === 'desc' ? -1 : 1;
  const sort = typeof query.sort === 'string' ? query.sort : 'consignee';
  return [...items].sort((a, b) => {
    let av;
    let bv;
    switch (sort) {
      case 'challanNo':
        av = a.challanNo;
        bv = b.challanNo;
        break;
      case 'mineral':
        av = a.mineral ?? '';
        bv = b.mineral ?? '';
        break;
      case 'vehicle':
        av = a.vehicleRegNo ?? '';
        bv = b.vehicleRegNo ?? '';
        break;
      case 'destination':
        av = a.destination ?? '';
        bv = b.destination ?? '';
        break;
      case 'date':
        av = a.transportedDate ?? '';
        bv = b.transportedDate ?? '';
        break;
      case 'qty':
        return (a.quantity - b.quantity) * dir;
      case 'status':
        av = a.checkStatus ?? '';
        bv = b.checkStatus ?? '';
        break;
      case 'slNo':
        return (a.slNo - b.slNo) * dir;
      default:
        av = a.consigneeName;
        bv = b.consigneeName;
    }
    const cmp = String(av).localeCompare(String(bv), 'en', { numeric: true });
    return cmp * dir || (a.slNo - b.slNo) * dir;
  });
}

export async function fetchChalaanPassList(prisma, query) {
  const { limit, offset } = resolvePageParams(query);
  const where = buildPassWhere(query);

  let rows = await prisma.reportChallanPassSummary.findMany({ where });

  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : '';
  if (query.dateMode === 'range' && (dateFrom || dateTo)) {
    rows = rows.filter((r) =>
      isReportDateInRange(r.lastReportDate, dateFrom || null, dateTo || null),
    );
  }

  const mapped = sortPasses(rows.map(mapPassRow), query);
  const total = mapped.length;
  const totalQuantity = mapped.reduce((s, r) => s + r.quantity, 0);
  const page = mapped.slice(offset, offset + limit);

  const latest = await prisma.reportChallanPassSummary.findFirst({
    orderBy: { lastScrapedAt: 'desc' },
    select: { lastScrapedAt: true },
  });

  return {
    snapshot: null,
    reportScope: query.reportScope === 'range' ? 'range' : 'all',
    entityCount: total,
    snapshotCount: total,
    snapshotsTruncated: false,
    latestScrapedAt: latest?.lastScrapedAt?.toISOString() ?? null,
    total,
    totalQuantity,
    truncated: false,
    portalPassTotal: null,
    incompleteScrape: false,
    limit,
    offset,
    items: page,
  };
}
