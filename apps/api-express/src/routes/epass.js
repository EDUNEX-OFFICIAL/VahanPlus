import express from 'express';
import { getPrisma } from '@vahanplus/db';
import { requireAuth } from '../middleware/auth.js';
import {
  enqueueChallanPassJobs,
  enqueueConsignerJobsForSnapshot,
  enqueueMissingVehicleStatusFromPasses,
  enqueueVehicleStatusJobs,
} from '@vahanplus/epass-orchestrator';
import { buildConsignerChallansWhere } from '../services/consignerChallanFilters.js';
import {
  applyConsignerNameFilter,
  normalizeConsigneeFilterQuery,
  normalizeConsignerFilterQuery,
} from '../lib/epass-query-normalize.js';
import {
  canonicalTransportDate,
  isReportDateInRange,
  parseDateFlexible,
  compareReportDates,
  parseReportDate,
  reportDateLookupVariantsInIsoRange,
} from '../utils/epassDates.js';
import {
  fetchVehicleStatusGlobalStats,
  fetchVehicleStatusPage,
  loadCrmLookupSets,
} from '../services/vehicleStatusDb.js';
import { mapVehicleStatusListItem } from '../services/vehicleStatusList.js';
import { observeEpassQuery } from '../metrics.js';
import { isReportingReadModelEnabled } from '../services/reporting/config.js';
import { validateReportingQuery } from '../services/reporting/queryGuard.js';
import {
  fetchDistrictBrowse,
  fetchFilterOptions,
  fetchMineralBrowse,
} from '../services/reporting/districtReporting.js';
import {
  fetchConsignerList,
  fetchConsignerOptions,
} from '../services/reporting/consignerReporting.js';
import { fetchChallanPassList } from '../services/reporting/challanReporting.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { fetchConsigneeChallans } from '../services/reporting/consigneeReporting.js';
import { fetchVehicleDataList } from '../services/reporting/vehicleReporting.js';

const router = express.Router();

router.use(requireAuth);

function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

function normalizeMineralLabel(value) {
  const source = String(value ?? '').trim();
  if (!source) return null;
  const lower = source.toLowerCase();
  if (lower.includes('yellow')) return 'Sand Yellow';
  if (lower.includes('white')) return 'Sand White';
  const cleaned = source
    .replace(/\bno\s*size\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

function normalizeConsignerName(value) {
  const source = String(value ?? '').trim();
  if (!source) return '';
  return source.replace(/-\d{5,}$/g, '').trim();
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

function parseOperatorFromQuery(query) {
  const raw = query.operator ?? query.role;
  if (raw === 'lessee' || raw === 'dealer') return raw;
  return null;
}

function mapRow(row, consignerCounts = null) {
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
    id: row.id,
    snapshotId: row.snapshotId,
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

  if (!consignerCounts) return base;

  const lessee = consignerCounts.get(`${row.id}:lessee`) ?? { consigners: 0, challans: 0 };
  const dealer = consignerCounts.get(`${row.id}:dealer`) ?? { consigners: 0, challans: 0 };

  return {
    ...base,
    lesseeConsignerScrapeStatus: scrapeStatus(row.lesseePasses, lessee),
    dealerConsignerScrapeStatus: scrapeStatus(row.dealerPasses, dealer),
  };
}

function scrapeStatus(expectedPasses, counts) {
  if (expectedPasses <= 0) return 'n/a';
  if (counts.consigners === 0) return 'pending';
  if (counts.challanExpected > 0 && counts.challans < counts.challanExpected) return 'partial';
  return 'complete';
}

const CONSIGNER_GHAT_CHALLAN_INCLUDE = {
  challans: {
    take: 1,
    orderBy: { slNo: 'asc' },
    select: { id: true, ghatNumber: true },
  },
};

function ghatFieldsFromConsigner(row) {
  if (row.operatorType !== 'lessee') {
    return { ghatNumber: null, ghatChallanId: null };
  }
  const fromConsigner = row.ghatNumber?.trim() || null;
  const first = row.challans?.[0];
  const fromChallan = first?.ghatNumber?.trim() || null;
  return {
    ghatNumber: fromConsigner ?? fromChallan,
    ghatChallanId: row.id,
  };
}

function mapConsigner(row) {
  const operatorType = row.operatorType;
  return {
    id: row.id,
    districtRowId: row.districtRowId,
    snapshotId: row.snapshotId,
    operatorType,
    role: operatorType,
    slNo: row.slNo,
    consignerName: normalizeConsignerName(row.consignerName),
    mineral: normalizeMineralLabel(row.mineral),
    mineralType: row.mineralType,
    challanCount: row.challanCount,
    challanDetailUrl: row.challanDetailUrl,
    scrapedAt: row.scrapedAt.toISOString(),
    challanLineCount: row._count?.challans ?? 0,
    ...ghatFieldsFromConsigner(row),
  };
}

function mapConsignerListItem(row) {
  return {
    ...mapConsigner(row),
    dmoName: row.districtRow.dmoName,
    districtSlNo: row.districtRow.slNo,
  };
}

function consignerDedupeKey(row) {
  return [
    row.districtRow.dmoName.toLowerCase(),
    row.operatorType,
    row.consignerName.toLowerCase(),
    (row.mineral ?? '').toLowerCase(),
    String(row.slNo),
  ].join('|');
}

function preferConsignerRecord(a, b) {
  const aLines = a._count?.challans ?? 0;
  const bLines = b._count?.challans ?? 0;
  if (bLines !== aLines) return bLines > aLines ? b : a;
  if (b.challanCount !== a.challanCount) return b.challanCount > a.challanCount ? b : a;
  return a;
}

function preferLatestScrapedConsigner(a, b) {
  const aScraped = new Date(a.districtRow?.snapshot?.scrapedAt ?? a.scrapedAt ?? 0);
  const bScraped = new Date(b.districtRow?.snapshot?.scrapedAt ?? b.scrapedAt ?? 0);
  return bScraped > aScraped ? b : a;
}

/** All-reports browse: one row per consigner identity, summed challan counts. */
function mergeConsignerRecordsForAllScope(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = consignerOptionIdentityKey(row);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    const base = preferLatestScrapedConsigner(prev, row);
    byKey.set(key, {
      ...base,
      challanCount: prev.challanCount + row.challanCount,
      _count: { challans: (prev._count?.challans ?? 0) + (row._count?.challans ?? 0) },
    });
  }
  return [...byKey.values()];
}

function dedupeConsignerRecords(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = consignerDedupeKey(row);
    const prev = byKey.get(key);
    byKey.set(key, prev ? preferConsignerRecord(prev, row) : row);
  }
  return [...byKey.values()];
}

function snapshotReportDateFromPassRow(row) {
  return row.challanRow?.consignerRow?.districtRow?.snapshot?.reportDate ?? '';
}

function challanPassDedupeKey(row) {
  return [
    snapshotReportDateFromPassRow(row).toLowerCase(),
    (row.challanNo ?? '').toLowerCase(),
    (row.vehicleRegNo ?? '').toLowerCase(),
    canonicalTransportDate(row.transportedDate),
    (row.destination ?? '').toLowerCase(),
    String(toNumber(row.quantity)),
    (row.unit ?? '').toLowerCase(),
    (normalizeMineralLabel(row.mineral) ?? '').toLowerCase(),
    (row.checkStatus ?? '').toLowerCase(),
    (row.consigneeName ?? '').toLowerCase(),
  ].join('|');
}

const CHALLAN_PASS_RAW_CAP = 25000;
const CONSIGNER_CHALLAN_RAW_CAP = 25000;

function preferChallanPassRow(a, b) {
  const aScraped = a.scrapedAt instanceof Date ? a.scrapedAt : new Date(a.scrapedAt);
  const bScraped = b.scrapedAt instanceof Date ? b.scrapedAt : new Date(b.scrapedAt);
  return bScraped > aScraped ? b : a;
}

function dedupeChallanPassRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = challanPassDedupeKey(row);
    const prev = byKey.get(key);
    byKey.set(key, prev ? preferChallanPassRow(prev, row) : row);
  }
  return [...byKey.values()];
}

async function resolveSnapshot(prisma, snapshotId) {
  if (snapshotId) {
    return prisma.epassSnapshot.findUnique({ where: { id: snapshotId } });
  }
  return prisma.epassSnapshot.findFirst({ orderBy: { scrapedAt: 'desc' } });
}

function parseIsoDateInput(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveSnapshotsForQuery(prisma, query) {
  const dateMode = query.dateMode === 'range' ? 'range' : 'specific';

  if (dateMode === 'range') {
    const rangeError = validateReportingQuery(query);
    if (rangeError) {
      const err = new Error(rangeError);
      err.statusCode = 400;
      throw err;
    }
    const from = typeof query.dateFrom === 'string' ? query.dateFrom : '';
    const to = typeof query.dateTo === 'string' ? query.dateTo : query.dateFrom || '';
    const reportDates = reportDateLookupVariantsInIsoRange(from, to);
    if (reportDates === null) {
      const err = new Error('dateMode=range requires dateFrom and/or dateTo bounds');
      err.statusCode = 400;
      throw err;
    }
    if (reportDates.length === 0) return { snapshots: [], allScopeMeta: null };
    const snapshots = await prisma.epassSnapshot.findMany({
      where: { reportDate: { in: reportDates } },
      orderBy: { scrapedAt: 'desc' },
    });
    return {
      snapshots: snapshots.filter((s) =>
        isReportDateInRange(s.reportDate, from || null, to || null),
      ),
      allScopeMeta: null,
    };
  }

  if (query.reportScope === 'all') {
    const err = new Error('reportScope=all requires CQRS read model');
    err.statusCode = 400;
    throw err;
  }

  if (query.snapshotId) {
    const one = await prisma.epassSnapshot.findUnique({ where: { id: query.snapshotId } });
    return { snapshots: one ? [one] : [], allScopeMeta: null };
  }

  const latest = await prisma.epassSnapshot.findFirst({ orderBy: { scrapedAt: 'desc' } });
  return { snapshots: latest ? [latest] : [], allScopeMeta: null };
}

function buildConsignerWhereForSnapshots(snapshotIds, query) {
  const where = { snapshotId: { in: snapshotIds } };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    where.operatorType = operatorType;
  }
  const consigner = normalizeConsignerFilterQuery(query.consigner);
  applyConsignerNameFilter(where, consigner);
  const districts = parseDistrictList(query);
  if (districts.length > 0) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: districts.map((d) => ({
          districtRow: { dmoName: { equals: d, mode: 'insensitive' } },
        })),
      },
    ];
  }
  const minerals = parseMineralList(query);
  if (minerals.length > 0) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: minerals.map((m) => ({
          mineral: { equals: m, mode: 'insensitive' },
        })),
      },
    ];
  }
  if (query.hideZeroChallans === '1') {
    where.challanCount = { gt: 0 };
  }
  return where;
}

function consignerOptionIdentityKey(row) {
  return `${row.districtRow.dmoName.toLowerCase()}|${row.operatorType}|${row.consignerName.toLowerCase()}`;
}

function dedupeConsignerOptions(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = consignerOptionIdentityKey(row);
    const prev = byKey.get(key);
    if (
      !prev ||
      new Date(row.districtRow.snapshot.scrapedAt) > new Date(prev.districtRow.snapshot.scrapedAt)
    ) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const dmo = a.districtRow.dmoName.localeCompare(b.districtRow.dmoName);
    if (dmo !== 0) return dmo;
    const op = a.operatorType.localeCompare(b.operatorType);
    if (op !== 0) return op;
    return a.consignerName.localeCompare(b.consignerName);
  });
}

function parseMineralList(query) {
  const raw = typeof query.mineral === 'string' ? query.mineral : '';
  return raw
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

function parseDistrictList(query) {
  const raw =
    (typeof query.district === 'string' ? query.district : '') ||
    (typeof query.dmo === 'string' ? query.dmo : '');
  return raw
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
}

function buildConsignerWhere(snapshotId, query) {
  const where = { snapshotId };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    where.operatorType = operatorType;
  }
  const consigner = normalizeConsignerFilterQuery(query.consigner);
  applyConsignerNameFilter(where, consigner);
  const districts = parseDistrictList(query);
  if (districts.length > 0) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: districts.map((d) => ({
          districtRow: { dmoName: { equals: d, mode: 'insensitive' } },
        })),
      },
    ];
  }
  const minerals = parseMineralList(query);
  if (minerals.length > 0) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: minerals.map((m) => ({
          mineral: { equals: m, mode: 'insensitive' },
        })),
      },
    ];
  }
  if (query.hideZeroChallans === '1') {
    where.challanCount = { gt: 0 };
  }
  return where;
}

function buildConsignerOrderBy(query) {
  const sort = typeof query.sort === 'string' ? query.sort : '';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  const slNo = { slNo: 'asc' };

  switch (sort) {
    case 'consigner':
      return [{ consignerName: dir }, slNo];
    case 'mineral':
      return [{ mineral: dir }, slNo];
    case 'role':
    case 'operator':
      return [{ operatorType: dir }, { districtRow: { dmoName: dir } }, slNo];
    case 'challans':
      return [{ challanCount: dir }, slNo];
    case 'slNo':
      return [{ slNo: dir }];
    case 'district':
    default:
      return [{ districtRow: { dmoName: dir } }, { operatorType: dir }, slNo];
  }
}

function mapChallan(row) {
  const reportDate = row.consignerRow?.districtRow?.snapshot?.reportDate ?? '';
  const storedPassCount = row._count?.passes;
  const scrapeComplete =
    storedPassCount == null || row.challanCount <= 0 ? true : storedPassCount >= row.challanCount;
  return {
    id: row.id,
    consignerRowId: row.consignerRowId,
    slNo: row.slNo,
    reportDate,
    consigneeName: row.consigneeName,
    mineral: normalizeMineralLabel(row.mineral),
    mineralCategory: row.mineralCategory,
    challanCount: row.challanCount,
    storedPassCount: storedPassCount ?? 0,
    scrapeComplete,
    dispatchedQty: toNumber(row.dispatchedQty),
    unit: row.unit,
    ghatNumber: row.ghatNumber ?? null,
    operatorType: row.consignerRow?.operatorType ?? null,
    detailUrl: row.detailUrl,
    scrapedAt: row.scrapedAt.toISOString(),
  };
}

function challanRowsIncompleteScrape(items) {
  return items.some((row) => row.challanCount > 0 && !row.scrapeComplete);
}

function buildChallanRowConsignerWhere(snapshotIdOrIds, query) {
  const consignerRow = Array.isArray(snapshotIdOrIds)
    ? { snapshotId: { in: snapshotIdOrIds } }
    : { snapshotId: snapshotIdOrIds };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    consignerRow.operatorType = operatorType;
  }

  const dmo = typeof query.dmo === 'string' ? query.dmo.trim() : '';
  const consigner = normalizeConsignerFilterQuery(query.consigner);
  const districts = parseDistrictList(query);

  if (districts.length > 0) {
    consignerRow.AND = [
      ...(consignerRow.AND ?? []),
      {
        OR: districts.map((d) => ({
          districtRow: { dmoName: { equals: d, mode: 'insensitive' } },
        })),
      },
    ];
  } else if (dmo) {
    consignerRow.districtRow = { dmoName: { contains: dmo, mode: 'insensitive' } };
  }

  applyConsignerNameFilter(consignerRow, consigner);
  return consignerRow;
}

async function sumPortalPassCountForQuery(prisma, snapshotIdOrIds, query) {
  const consignee = normalizeConsigneeFilterQuery(query.consignee);
  if (!consignee) return null;

  const consignerRow = buildChallanRowConsignerWhere(snapshotIdOrIds, query);
  const rows = await prisma.epassChallanRow.findMany({
    where: {
      consignerRow,
      consigneeName: { contains: consignee, mode: 'insensitive' },
    },
    select: { challanCount: true },
  });
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => sum + row.challanCount, 0);
}

function mapChallanListItem(row) {
  const { consignerRow } = row;
  return {
    ...mapChallan(row),
    consignerName: normalizeConsignerName(consignerRow.consignerName),
    operatorType: consignerRow.operatorType,
    role: consignerRow.operatorType,
    dmoName: consignerRow.districtRow.dmoName,
    districtSlNo: consignerRow.districtRow.slNo,
  };
}

function buildChallanBrowseWhere(snapshotId, query) {
  const consignerRow = { snapshotId };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    consignerRow.operatorType = operatorType;
  }

  const dmo = typeof query.dmo === 'string' ? query.dmo.trim() : '';
  const consigner = normalizeConsignerFilterQuery(query.consigner);
  const districts = parseDistrictList(query);

  if (districts.length > 0) {
    consignerRow.AND = [
      ...(consignerRow.AND ?? []),
      {
        OR: districts.map((d) => ({
          districtRow: { dmoName: { equals: d, mode: 'insensitive' } },
        })),
      },
    ];
  } else if (dmo) {
    consignerRow.districtRow = { dmoName: { contains: dmo, mode: 'insensitive' } };
  }

  applyConsignerNameFilter(consignerRow, consigner);

  const where = { consignerRow };
  const consignee = normalizeConsigneeFilterQuery(query.consignee);
  if (consignee) {
    where.consigneeName = { contains: consignee, mode: 'insensitive' };
  }

  const minerals = parseMineralList(query);
  if (minerals.length > 0) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: minerals.map((m) => ({
          mineral: { equals: m, mode: 'insensitive' },
        })),
      },
    ];
  }

  if (query.hideZeroPasses === '1') {
    where.challanCount = { gt: 0 };
  }

  return where;
}

function buildChallanBrowseOrderBy(query) {
  const sort = typeof query.sort === 'string' ? query.sort : '';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  const slNo = { slNo: 'asc' };

  switch (sort) {
    case 'consigner':
      return [{ consignerRow: { consignerName: dir } }, slNo];
    case 'operator':
    case 'role':
      return [{ consignerRow: { operatorType: dir } }, slNo];
    case 'consignee':
      return [{ consigneeName: dir }, slNo];
    case 'mineral':
      return [{ mineral: dir }, slNo];
    case 'passes':
      return [{ challanCount: dir }, slNo];
    case 'qty':
      return [{ dispatchedQty: dir }, slNo];
    case 'slNo':
      return [{ slNo: dir }];
    case 'district':
    default:
      return [
        { consignerRow: { districtRow: { dmoName: dir } } },
        { consignerRow: { consignerName: dir } },
        { consigneeName: dir },
        slNo,
      ];
  }
}

function buildChallanPassBrowseWhere(snapshotIdOrIds, query) {
  const consignerRow = Array.isArray(snapshotIdOrIds)
    ? { snapshotId: { in: snapshotIdOrIds } }
    : { snapshotId: snapshotIdOrIds };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    consignerRow.operatorType = operatorType;
  }

  const dmo = typeof query.dmo === 'string' ? query.dmo.trim() : '';
  const consigner = normalizeConsignerFilterQuery(query.consigner);
  const districts = parseDistrictList(query);

  if (districts.length > 0) {
    consignerRow.AND = [
      ...(consignerRow.AND ?? []),
      {
        OR: districts.map((d) => ({
          districtRow: { dmoName: { equals: d, mode: 'insensitive' } },
        })),
      },
    ];
  } else if (dmo) {
    consignerRow.districtRow = { dmoName: { contains: dmo, mode: 'insensitive' } };
  }

  applyConsignerNameFilter(consignerRow, consigner);

  const where = { challanRow: { consignerRow } };

  const consignee = normalizeConsigneeFilterQuery(query.consignee);
  if (consignee) {
    where.consigneeName = { contains: consignee, mode: 'insensitive' };
  }
  const destination = typeof query.destination === 'string' ? query.destination.trim() : '';
  if (destination) {
    where.destination = { contains: destination, mode: 'insensitive' };
  }

  const challan = typeof query.challan === 'string' ? query.challan.trim() : '';
  if (challan) {
    where.challanNo = { contains: challan, mode: 'insensitive' };
  }

  const minerals = parseMineralList(query);
  if (minerals.length > 0) {
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: minerals.map((m) => ({
          mineral: { equals: m, mode: 'insensitive' },
        })),
      },
    ];
  }

  if (query.hideZeroPasses === '1') {
    where.quantity = { gt: 0 };
  }

  return where;
}

function buildChallanPassBrowseOrderBy(query) {
  const sort = typeof query.sort === 'string' ? query.sort : '';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  const slNo = { slNo: 'asc' };

  switch (sort) {
    case 'challanNo':
      return [{ challanNo: dir }, slNo];
    case 'consignee':
      return [{ consigneeName: dir }, slNo];
    case 'mineral':
      return [{ mineral: dir }, slNo];
    case 'vehicle':
      return [{ vehicleRegNo: dir }, slNo];
    case 'destination':
      return [{ destination: dir }, slNo];
    case 'date':
      return [{ transportedDate: dir }, slNo];
    case 'qty':
      return [{ quantity: dir }, slNo];
    case 'status':
      return [{ checkStatus: dir }, slNo];
    case 'slNo':
      return [{ slNo: dir }];
    default:
      return [{ consigneeName: dir }, slNo];
  }
}

function compareChallanPassBrowseRows(a, b, sort, dir) {
  const mult = dir === 'desc' ? -1 : 1;
  const slCmp = (a.slNo ?? 0) - (b.slNo ?? 0);

  const strCmp = (x, y) =>
    String(x ?? '').localeCompare(String(y ?? ''), undefined, { sensitivity: 'base' });
  const numCmp = (x, y) => toNumber(x) - toNumber(y);

  let cmp = 0;
  switch (sort) {
    case 'challanNo':
      cmp = strCmp(a.challanNo, b.challanNo);
      break;
    case 'consignee':
      cmp = strCmp(a.consigneeName, b.consigneeName);
      break;
    case 'mineral':
      cmp = strCmp(a.mineral, b.mineral);
      break;
    case 'vehicle':
      cmp = strCmp(a.vehicleRegNo, b.vehicleRegNo);
      break;
    case 'destination':
      cmp = strCmp(a.destination, b.destination);
      break;
    case 'date':
      cmp = strCmp(a.transportedDate, b.transportedDate);
      break;
    case 'qty':
      cmp = numCmp(a.quantity, b.quantity);
      break;
    case 'status':
      cmp = strCmp(a.checkStatus, b.checkStatus);
      break;
    case 'slNo':
      return mult * slCmp;
    default:
      cmp = strCmp(a.consigneeName, b.consigneeName);
  }
  if (cmp !== 0) return mult * cmp;
  return slCmp;
}

function sortChallanPassBrowseRows(rows, query) {
  const sort = typeof query.sort === 'string' ? query.sort : '';
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  rows.sort((a, b) => compareChallanPassBrowseRows(a, b, sort, dir));
}

function normalizeVehicleRegNo(raw) {
  if (raw == null) return null;
  const normalized = String(raw).trim().replace(/\s+/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

const MCV_PORTAL_STATUSES = ['on_portal', 'no_portal_data', 'not_checked'];

function parsePortalStatusFilter(query) {
  const raw = typeof query.portalStatus === 'string' ? query.portalStatus.trim() : '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => MCV_PORTAL_STATUSES.includes(s));
}

function parseVehicleDataSearchQuery(query) {
  const raw = typeof query.q === 'string' ? query.q.trim() : '';
  if (!raw) return '';
  return normalizeVehicleRegNo(raw) ?? raw;
}

function createEmptyVehicleDataAggregate(vehicleRegNo) {
  return {
    vehicleRegNo,
    passCount: 0,
    quantityByUnit: {},
    minerals: new Set(),
    dmoNames: new Set(),
    consignerNames: new Set(),
    destinations: new Set(),
    lastTransportedDate: null,
    lastScrapedAt: null,
  };
}

async function mergeStatusOnlyVehicleDataAggregates(prisma, aggMap, query) {
  const q = parseVehicleDataSearchQuery(query);
  if (!q) return;

  const statusRows = await prisma.epassVehicleStatusRow.findMany({
    where: {
      OR: [
        { vehicleRegNo: { contains: q, mode: 'insensitive' } },
        { ksRegNo: { contains: q, mode: 'insensitive' } },
      ],
    },
  });

  for (const statusRow of statusRows) {
    const vrn = normalizeVehicleRegNo(statusRow.vehicleRegNo);
    if (!vrn || aggMap.has(vrn)) continue;
    aggMap.set(vrn, createEmptyVehicleDataAggregate(vrn));
  }
}

function buildVehicleDataPassWhere(snapshotIdOrIds, query) {
  const where = buildChallanPassBrowseWhere(snapshotIdOrIds, query);
  const and = [...(where.AND ?? [])];
  and.push({ vehicleRegNo: { not: null } });
  const q = parseVehicleDataSearchQuery(query);
  if (q) {
    and.push({ vehicleRegNo: { contains: q, mode: 'insensitive' } });
  }
  if (and.length > 0) where.AND = and;
  return where;
}

const CHALLAN_PASS_LIST_INCLUDE = {
  challanRow: {
    select: {
      detailUrl: true,
      consignerRowId: true,
      consignerRow: {
        select: {
          id: true,
          operatorType: true,
          consignerName: true,
          districtRow: {
            select: {
              dmoName: true,
              snapshot: { select: { reportDate: true } },
            },
          },
        },
      },
    },
  },
};

function aggregatePassRow(map, row) {
  const vehicleRegNo = normalizeVehicleRegNo(row.vehicleRegNo);
  if (!vehicleRegNo) return;

  let agg = map.get(vehicleRegNo);
  if (!agg) {
    agg = {
      vehicleRegNo,
      passCount: 0,
      quantityByUnit: {},
      minerals: new Set(),
      dmoNames: new Set(),
      consignerNames: new Set(),
      destinations: new Set(),
      lastTransportedDate: null,
      lastScrapedAt: null,
    };
    map.set(vehicleRegNo, agg);
  }

  agg.passCount += 1;
  const unitKey = (row.unit && String(row.unit).trim()) || '—';
  const qty = toNumber(row.quantity);
  agg.quantityByUnit[unitKey] = (agg.quantityByUnit[unitKey] ?? 0) + qty;

  const mineral = normalizeMineralLabel(row.mineral);
  if (mineral) agg.minerals.add(mineral);
  if (row.destination) agg.destinations.add(row.destination);

  const consignerRow = row.challanRow?.consignerRow;
  if (consignerRow?.districtRow?.dmoName) agg.dmoNames.add(consignerRow.districtRow.dmoName);
  if (consignerRow?.consignerName) agg.consignerNames.add(consignerRow.consignerName);

  const transported = row.transportedDate?.trim() || null;
  if (
    transported &&
    (!agg.lastTransportedDate || transported.localeCompare(agg.lastTransportedDate) > 0)
  ) {
    agg.lastTransportedDate = transported;
  }

  const scrapedAt = row.scrapedAt instanceof Date ? row.scrapedAt : new Date(row.scrapedAt);
  if (!agg.lastScrapedAt || scrapedAt > agg.lastScrapedAt) {
    agg.lastScrapedAt = scrapedAt;
  }
}

function mapVehicleDataAggregate(agg, hasVehicleStatus) {
  const units = Object.keys(agg.quantityByUnit);
  const totalQuantity = units.length === 1 ? agg.quantityByUnit[units[0]] : null;
  return {
    vehicleRegNo: agg.vehicleRegNo,
    passCount: agg.passCount,
    totalQuantity,
    quantityByUnit: agg.quantityByUnit,
    minerals: [...agg.minerals].sort((a, b) => a.localeCompare(b)),
    dmoNames: [...agg.dmoNames].sort((a, b) => a.localeCompare(b)),
    consignerNames: [...agg.consignerNames].sort((a, b) => a.localeCompare(b)),
    destinations: [...agg.destinations].sort((a, b) => a.localeCompare(b)),
    lastTransportedDate: agg.lastTransportedDate,
    lastScrapedAt: agg.lastScrapedAt ? agg.lastScrapedAt.toISOString() : null,
    hasVehicleStatus,
  };
}

async function enrichVehicleDataAggregates(prisma, allAggs) {
  const allVrns = allAggs.map((item) => item.vehicleRegNo);
  const statusRows =
    allVrns.length > 0
      ? await prisma.epassVehicleStatusRow.findMany({
          where: { vehicleRegNo: { in: allVrns } },
          select: {
            vehicleRegNo: true,
            grossWeightMt: true,
            unladenWeightMt: true,
            found: true,
          },
        })
      : [];
  const statusByVrn = new Map(statusRows.map((r) => [r.vehicleRegNo, r]));

  return allAggs.map((item) => {
    const status = statusByVrn.get(item.vehicleRegNo);
    const mcvPortalStatus = !status ? 'not_checked' : status.found ? 'on_portal' : 'no_portal_data';
    return {
      ...item,
      mcvPortalStatus,
      hasVehicleStatus: mcvPortalStatus === 'on_portal',
      grossWeightMt: status?.grossWeightMt != null ? toNumber(status.grossWeightMt) : null,
      unladenWeightMt: status?.unladenWeightMt != null ? toNumber(status.unladenWeightMt) : null,
    };
  });
}

function sortVehicleDataAggregates(items, sort, dir) {
  const mult = dir === 'desc' ? -1 : 1;
  items.sort((a, b) => {
    switch (sort) {
      case 'passes':
        return mult * (a.passCount - b.passCount);
      case 'qty': {
        const aQty = a.totalQuantity ?? Object.values(a.quantityByUnit).reduce((s, n) => s + n, 0);
        const bQty = b.totalQuantity ?? Object.values(b.quantityByUnit).reduce((s, n) => s + n, 0);
        return mult * (aQty - bQty);
      }
      case 'lastDate': {
        const aDate = a.lastTransportedDate ?? '';
        const bDate = b.lastTransportedDate ?? '';
        return mult * aDate.localeCompare(bDate);
      }
      case 'grossWeight': {
        const aW = a.grossWeightMt ?? -1;
        const bW = b.grossWeightMt ?? -1;
        return mult * (aW - bW);
      }
      case 'unladen': {
        const aW = a.unladenWeightMt ?? -1;
        const bW = b.unladenWeightMt ?? -1;
        return mult * (aW - bW);
      }
      default:
        return mult * a.vehicleRegNo.localeCompare(b.vehicleRegNo);
    }
  });
}

function mapChallanPassListItem(row) {
  const { challanRow } = row;
  const { consignerRow } = challanRow;
  return {
    ...mapChallanPass(row),
    consignerRowId: consignerRow.id,
    consignerName: normalizeConsignerName(consignerRow.consignerName),
    operatorType: consignerRow.operatorType,
    role: consignerRow.operatorType,
    dmoName: consignerRow.districtRow.dmoName,
    summaryDetailUrl: challanRow.detailUrl,
  };
}

async function buildConsignerCountMap(prisma, districtRowIds) {
  const counts = new Map();
  if (districtRowIds.length === 0) return counts;

  const rows = await prisma.epassConsignerRow.findMany({
    where: { districtRowId: { in: districtRowIds } },
    include: { _count: { select: { challans: true } } },
  });

  for (const row of rows) {
    const key = `${row.districtRowId}:${row.operatorType}`;
    const prev = counts.get(key) ?? { consigners: 0, challans: 0, challanExpected: 0 };
    prev.consigners += 1;
    if (row.challanCount > 0) prev.challanExpected += 1;
    if (row._count.challans > 0) prev.challans += 1;
    counts.set(key, prev);
  }

  return counts;
}

router.get('/latest', async (_req, res) => {
  try {
    const prisma = getPrisma();

    const snapshot = await prisma.epassSnapshot.findFirst({
      orderBy: { scrapedAt: 'desc' },
      include: {
        rows: { orderBy: { slNo: 'asc' } },
        _count: { select: { rows: true } },
      },
    });

    if (!snapshot) {
      return res.json({ snapshot: null, rows: [] });
    }

    const consignerCounts = await buildConsignerCountMap(
      prisma,
      snapshot.rows.map((r) => r.id),
    );

    res.json({
      snapshot: {
        id: snapshot.id,
        reportDate: snapshot.reportDate,
        reportGeneratedOn: snapshot.reportGeneratedOn,
        scrapedAt: snapshot.scrapedAt.toISOString(),
        rowCount: snapshot._count.rows,
        jobId: snapshot.jobId,
      },
      rows: snapshot.rows.map((r) => mapRow(r, consignerCounts)),
    });
  } catch (err) {
    console.error('GET /epass/latest failed:', err);
    res.status(503).json({
      error: 'Database unavailable',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

router.get('/snapshots/report-dates', async (req, res) => {
  const prisma = getPrisma();
  const maxRows = Math.min(Number(req.query.limit) || 10_000, 10_000);

  const rows = await prisma.epassSnapshot.findMany({
    select: {
      id: true,
      reportDate: true,
      scrapedAt: true,
      sourceUrl: true,
    },
    orderBy: { scrapedAt: 'desc' },
    take: maxRows * 3,
  });

  const byDate = new Map();
  for (const row of rows) {
    const existing = byDate.get(row.reportDate);
    if (!existing || row.scrapedAt > existing.scrapedAt) {
      byDate.set(row.reportDate, row);
    }
  }

  const items = [...byDate.values()]
    .sort((a, b) => compareReportDates(b.reportDate, a.reportDate))
    .slice(0, maxRows);

  res.json({
    items: items.map((s) => ({
      id: s.id,
      reportDate: s.reportDate,
      scrapedAt: s.scrapedAt.toISOString(),
      sourceUrl: s.sourceUrl,
    })),
  });
});

router.get('/snapshots', async (req, res) => {
  const prisma = getPrisma();
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const snapshots = await prisma.epassSnapshot.findMany({
    orderBy: { scrapedAt: 'desc' },
    take: limit,
    include: {
      _count: { select: { rows: true } },
    },
  });

  res.json({
    items: snapshots.map((s) => ({
      id: s.id,
      reportDate: s.reportDate,
      reportGeneratedOn: s.reportGeneratedOn,
      scrapedAt: s.scrapedAt.toISOString(),
      rowCount: s._count.rows,
      jobId: s.jobId,
    })),
  });
});

function latestScrapedAtFromSnapshots(snapshots) {
  if (!snapshots.length) return null;
  return snapshots.reduce(
    (latest, s) => (s.scrapedAt > latest ? s.scrapedAt : latest),
    snapshots[0].scrapedAt,
  );
}

function spreadAllScopeMeta(allScopeMeta) {
  if (!allScopeMeta) return {};
  return {
    snapshotCount: allScopeMeta.snapshotCount,
    totalSnapshotCount: allScopeMeta.totalSnapshotCount,
    snapshotsTruncated: allScopeMeta.snapshotsTruncated,
  };
}

router.get('/district-rows/browse', async (req, res) => {
  const prisma = getPrisma();
  if (req.query.reportScope !== 'all') {
    return res.status(400).json({ error: 'reportScope=all is required' });
  }
  const rangeError = validateReportingQuery(req.query);
  if (rangeError) return res.status(400).json({ error: rangeError });

  if (isReportingReadModelEnabled()) {
    const started = Date.now();
    const payload = await fetchDistrictBrowse(prisma, req.query);
    observeEpassQuery(
      'district-rows/browse',
      'all',
      (Date.now() - started) / 1000,
      payload.rows.length,
      0,
    );
    return res.json(payload);
  }

  const { snapshots, allScopeMeta } = await resolveSnapshotsForQuery(prisma, req.query);
  const snapshotIds = snapshots.map((s) => s.id);
  if (snapshotIds.length === 0) {
    return res.json({
      snapshot: null,
      reportScope: 'all',
      snapshotCount: 0,
      totalSnapshotCount: 0,
      snapshotsTruncated: false,
      latestScrapedAt: null,
      rows: [],
    });
  }

  const rows = await prisma.epassDistrictRow.findMany({
    where: { snapshotId: { in: snapshotIds } },
    orderBy: [{ snapshotId: 'asc' }, { slNo: 'asc' }],
  });

  const consignerCounts = await buildConsignerCountMap(
    prisma,
    rows.map((r) => r.id),
  );

  const latestScrapedAt = latestScrapedAtFromSnapshots(snapshots);

  res.json({
    snapshot: null,
    reportScope: 'all',
    latestScrapedAt: latestScrapedAt?.toISOString() ?? null,
    ...spreadAllScopeMeta(allScopeMeta),
    rows: rows.map((r) => mapRow(r, consignerCounts)),
  });
});

router.get('/snapshots/:id/rows', async (req, res) => {
  const prisma = getPrisma();
  const snapshot = await prisma.epassSnapshot.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { rows: true } } },
  });

  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  const rows = await prisma.epassDistrictRow.findMany({
    where: { snapshotId: req.params.id },
    orderBy: { slNo: 'asc' },
  });

  const consignerCounts = await buildConsignerCountMap(
    prisma,
    rows.map((r) => r.id),
  );

  res.json({
    snapshot: {
      id: snapshot.id,
      reportDate: snapshot.reportDate,
      reportGeneratedOn: snapshot.reportGeneratedOn,
      scrapedAt: snapshot.scrapedAt.toISOString(),
      rowCount: snapshot._count.rows,
      jobId: snapshot.jobId,
    },
    rows: rows.map((r) => mapRow(r, consignerCounts)),
  });
});

router.post('/snapshots/:id/scrape-details', async (req, res) => {
  const prisma = getPrisma();
  const snapshot = await prisma.epassSnapshot.findUnique({ where: { id: req.params.id } });
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  const fanout = await enqueueConsignerJobsForSnapshot(prisma, snapshot.id);
  res.json({ snapshotId: snapshot.id, ...fanout });
});

router.post('/snapshots/:id/scrape-passes', async (req, res) => {
  const prisma = getPrisma();
  const snapshot = await prisma.epassSnapshot.findUnique({ where: { id: req.params.id } });
  if (!snapshot) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }

  const missingOnly = req.query.missingOnly === '1' || req.query.missingOnly === 'true';

  const challanWhere = {
    consignerRow: { snapshotId: snapshot.id },
    detailUrl: { not: null },
    challanCount: { gt: 0 },
  };
  if (missingOnly) {
    challanWhere.passes = { none: {} };
  }

  const challanRows = await prisma.epassChallanRow.findMany({
    where: challanWhere,
    select: { id: true, detailUrl: true, challanCount: true },
  });

  const fanout = await enqueueChallanPassJobs(prisma, challanRows);
  res.json({
    snapshotId: snapshot.id,
    reportDate: snapshot.reportDate,
    eligible: challanRows.length,
    ...fanout,
  });
});

router.get('/district-rows/:id', async (req, res) => {
  const prisma = getPrisma();
  const row = await prisma.epassDistrictRow.findUnique({
    where: { id: req.params.id },
    include: { snapshot: true },
  });

  if (!row) {
    return res.status(404).json({ error: 'District row not found' });
  }

  const consignerCounts = await buildConsignerCountMap(prisma, [row.id]);
  const lesseeKey = `${row.id}:lessee`;
  const dealerKey = `${row.id}:dealer`;
  const lessee = consignerCounts.get(lesseeKey) ?? {
    consigners: 0,
    challans: 0,
    challanExpected: 0,
  };
  const dealer = consignerCounts.get(dealerKey) ?? {
    consigners: 0,
    challans: 0,
    challanExpected: 0,
  };

  res.json({
    row: mapRow(row, consignerCounts),
    snapshot: {
      id: row.snapshot.id,
      reportDate: row.snapshot.reportDate,
      reportGeneratedOn: row.snapshot.reportGeneratedOn,
      scrapedAt: row.snapshot.scrapedAt.toISOString(),
    },
    consignerCounts: {
      lessee: lessee.consigners,
      dealer: dealer.consigners,
      lesseeChallanLines: lessee.challans,
      dealerChallanLines: dealer.challans,
    },
  });
});

router.get('/district-rows/:id/consigners', async (req, res) => {
  const prisma = getPrisma();
  const operatorType = parseOperatorFromQuery(req.query) ?? 'lessee';

  const row = await prisma.epassDistrictRow.findUnique({
    where: { id: req.params.id },
    include: { snapshot: true },
  });

  if (!row) {
    return res.status(404).json({ error: 'District row not found' });
  }

  const consigners = await prisma.epassConsignerRow.findMany({
    where: { districtRowId: row.id, operatorType },
    orderBy: { slNo: 'asc' },
    include: {
      _count: { select: { challans: true } },
      ...CONSIGNER_GHAT_CHALLAN_INCLUDE,
    },
  });

  res.json({
    districtRow: mapRow(row),
    snapshot: {
      reportDate: row.snapshot.reportDate,
      reportGeneratedOn: row.snapshot.reportGeneratedOn,
    },
    operatorType,
    role: operatorType,
    items: consigners.map(mapConsigner),
  });
});

function mapChallanPass(row) {
  return {
    id: row.id,
    challanRowId: row.challanRowId,
    slNo: row.slNo,
    consigneeName: row.consigneeName,
    challanNo: row.challanNo,
    portalPassId: row.portalPassId,
    mineral: normalizeMineralLabel(row.mineral),
    mineralCategory: row.mineralCategory,
    vehicleRegNo: row.vehicleRegNo,
    destination: row.destination,
    transportedDate: formatDateDmy(parseDateFlexible(row.transportedDate)) ?? row.transportedDate,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    checkStatus: row.checkStatus,
    portalChallanUrl: row.portalChallanUrl,
    scrapedAt: row.scrapedAt.toISOString(),
  };
}

router.get(['/challan-passes', '/chalaan-passes'], async (req, res) => {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const dateMode = req.query.dateMode === 'range' ? 'range' : 'specific';
  const isAllScope = req.query.reportScope === 'all';
  const useRange =
    !isAllScope &&
    dateMode === 'range' &&
    (typeof req.query.dateFrom === 'string' || typeof req.query.dateTo === 'string');

  if (isReportingReadModelEnabled() && (isAllScope || dateMode === 'range')) {
    const rangeError = validateReportingQuery(req.query);
    if (rangeError) return res.status(400).json({ error: rangeError });
    const started = Date.now();
    const payload = await fetchChallanPassList(prisma, req.query);
    observeEpassQuery(
      'challan-passes',
      isAllScope ? 'all' : 'range',
      (Date.now() - started) / 1000,
      payload.items.length,
      0,
    );
    return res.json(payload);
  }

  let snapshot = null;
  let rangeSnapshots = [];
  let allScopeMeta = null;
  let where;

  if (isAllScope) {
    const resolved = await resolveSnapshotsForQuery(prisma, req.query);
    rangeSnapshots = resolved.snapshots;
    allScopeMeta = resolved.allScopeMeta;
    const snapshotIds = rangeSnapshots.map((s) => s.id);
    if (snapshotIds.length === 0) {
      return res.json({
        snapshot: null,
        reportScope: 'all',
        snapshotCount: 0,
        totalSnapshotCount: 0,
        snapshotsTruncated: false,
        latestScrapedAt: null,
        total: 0,
        totalQuantity: 0,
        truncated: false,
        portalPassTotal: null,
        incompleteScrape: false,
        limit,
        offset,
        items: [],
      });
    }
    where = buildChallanPassBrowseWhere(snapshotIds, req.query);
  } else if (useRange) {
    const resolved = await resolveSnapshotsForQuery(prisma, req.query);
    rangeSnapshots = resolved.snapshots;
    const snapshotIds = rangeSnapshots.map((s) => s.id);
    if (snapshotIds.length === 0) {
      return res.json({
        snapshot: null,
        reportScope: 'range',
        snapshotCount: 0,
        latestScrapedAt: null,
        total: 0,
        totalQuantity: 0,
        truncated: false,
        portalPassTotal: null,
        incompleteScrape: false,
        limit,
        offset,
        items: [],
      });
    }
    where = buildChallanPassBrowseWhere(snapshotIds, req.query);
  } else {
    snapshot = await resolveSnapshot(prisma, req.query.snapshotId);
    if (!snapshot) {
      return res.json({
        snapshot: null,
        total: 0,
        totalQuantity: 0,
        truncated: false,
        portalPassTotal: null,
        incompleteScrape: false,
        limit,
        offset,
        items: [],
      });
    }
    where = buildChallanPassBrowseWhere(snapshot.id, req.query);
  }

  const rows = await prisma.epassChallanPassRow.findMany({
    where,
    include: CHALLAN_PASS_LIST_INCLUDE,
    take: CHALLAN_PASS_RAW_CAP,
    orderBy: [{ scrapedAt: 'desc' }, { slNo: 'asc' }],
  });

  const truncated = rows.length >= CHALLAN_PASS_RAW_CAP;
  const deduped = dedupeChallanPassRows(rows);
  sortChallanPassBrowseRows(deduped, req.query);
  const total = deduped.length;
  const totalQuantity = deduped.reduce((sum, row) => sum + toNumber(row.quantity), 0);
  const page = deduped.slice(offset, offset + limit);

  const snapshotIdsForPortalTotal =
    isAllScope || useRange ? rangeSnapshots.map((s) => s.id) : snapshot.id;
  const portalPassTotal = await sumPortalPassCountForQuery(
    prisma,
    snapshotIdsForPortalTotal,
    req.query,
  );
  const incompleteScrape =
    portalPassTotal != null && portalPassTotal > 0 && total < portalPassTotal;

  const latestScrapedAt =
    (isAllScope || useRange) && rangeSnapshots.length > 0
      ? latestScrapedAtFromSnapshots(rangeSnapshots)
      : null;

  res.json({
    snapshot:
      useRange || isAllScope
        ? null
        : {
            id: snapshot.id,
            reportDate: snapshot.reportDate,
            scrapedAt: snapshot.scrapedAt.toISOString(),
          },
    ...(isAllScope
      ? {
          reportScope: 'all',
          latestScrapedAt: latestScrapedAt?.toISOString() ?? null,
          ...spreadAllScopeMeta(allScopeMeta),
        }
      : useRange
        ? {
            reportScope: 'range',
            snapshotCount: rangeSnapshots.length,
            latestScrapedAt: latestScrapedAt?.toISOString() ?? null,
          }
        : {}),
    total,
    totalQuantity,
    truncated,
    portalPassTotal,
    incompleteScrape,
    limit,
    offset,
    items: page.map(mapChallanPassListItem),
  });
});

router.get('/minerals/browse', async (req, res) => {
  const prisma = getPrisma();
  if (req.query.reportScope !== 'all') {
    return res.status(400).json({ error: 'reportScope=all is required' });
  }
  if (!isReportingReadModelEnabled()) {
    return res.status(503).json({ error: 'Mineral read model not available' });
  }
  const started = Date.now();
  const payload = await fetchMineralBrowse(prisma, req.query);
  observeEpassQuery(
    'minerals/browse',
    'all',
    (Date.now() - started) / 1000,
    payload.minerals.length,
    0,
  );
  res.json(payload);
});

router.get('/filter-options', async (req, res) => {
  const prisma = getPrisma();
  if (req.query.reportScope !== 'all') {
    return res.status(400).json({ error: 'reportScope=all is required' });
  }

  if (isReportingReadModelEnabled()) {
    const started = Date.now();
    const payload = await fetchFilterOptions(prisma, req.query);
    observeEpassQuery(
      'filter-options',
      'all',
      (Date.now() - started) / 1000,
      payload.districts.length,
      0,
    );
    return res.json(payload);
  }

  const { snapshots, allScopeMeta } = await resolveSnapshotsForQuery(prisma, req.query);
  const snapshotIds = snapshots.map((s) => s.id);
  if (snapshotIds.length === 0) {
    return res.json({
      districts: [],
      minerals: [],
      latestScrapedAt: null,
      snapshotCount: 0,
      totalSnapshotCount: 0,
      snapshotsTruncated: false,
    });
  }

  const districtRows = await prisma.epassDistrictRow.findMany({
    where: { snapshotId: { in: snapshotIds } },
    select: { dmoName: true, lesseeMineral: true, dealerMineral: true },
  });

  const districtSet = new Set();
  const mineralSet = new Set();
  for (const row of districtRows) {
    if (row.dmoName?.trim()) districtSet.add(row.dmoName.trim());
    if (row.lesseeMineral?.trim()) mineralSet.add(row.lesseeMineral.trim());
    if (row.dealerMineral?.trim()) mineralSet.add(row.dealerMineral.trim());
  }

  res.json({
    districts: [...districtSet].sort((a, b) => a.localeCompare(b)),
    minerals: [...mineralSet].sort((a, b) => a.localeCompare(b)),
    latestScrapedAt: snapshots[0]?.scrapedAt?.toISOString() ?? null,
    ...spreadAllScopeMeta(allScopeMeta),
  });
});

router.get('/vehicle-data', async (req, res) => {
  const prisma = getPrisma();
  const isAllScope = req.query.reportScope === 'all';
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const sort =
    typeof req.query.sort === 'string' ? req.query.sort : isAllScope ? 'lastDate' : 'vehicle';
  const dir = req.query.dir === 'desc' ? 'desc' : isAllScope && !req.query.dir ? 'desc' : 'asc';
  const portalStatusFilter = parsePortalStatusFilter(req.query);

  if (isReportingReadModelEnabled() && isAllScope) {
    const started = Date.now();
    const payload = await fetchVehicleDataList(prisma, req.query);
    observeEpassQuery(
      'vehicle-data',
      'all',
      (Date.now() - started) / 1000,
      payload.items.length,
      0,
    );
    return res.json(payload);
  }

  let snapshot = null;
  let snapshotIds = [];
  let where;

  let allScopeMeta = null;

  if (isAllScope) {
    const resolved = await resolveSnapshotsForQuery(prisma, req.query);
    snapshotIds = resolved.snapshots.map((s) => s.id);
    allScopeMeta = resolved.allScopeMeta;
    if (snapshotIds.length === 0) {
      return res.json({
        snapshot: null,
        reportScope: 'all',
        snapshotCount: 0,
        totalSnapshotCount: 0,
        snapshotsTruncated: false,
        total: 0,
        limit,
        offset,
        items: [],
      });
    }
    where = buildVehicleDataPassWhere(snapshotIds, req.query);
  } else {
    snapshot = await resolveSnapshot(prisma, req.query.snapshotId);
    if (!snapshot) {
      return res.json({ snapshot: null, total: 0, limit, offset, items: [] });
    }
    where = buildVehicleDataPassWhere(snapshot.id, req.query);
  }

  const passRows = await prisma.epassChallanPassRow.findMany({
    where,
    include: CHALLAN_PASS_LIST_INCLUDE,
  });

  const aggMap = new Map();
  for (const row of passRows) {
    aggregatePassRow(aggMap, row);
  }
  await mergeStatusOnlyVehicleDataAggregates(prisma, aggMap, req.query);

  const allAggs = [...aggMap.values()].map((agg) => mapVehicleDataAggregate(agg, false));
  let enriched = await enrichVehicleDataAggregates(prisma, allAggs);

  if (portalStatusFilter.length > 0) {
    const allowed = new Set(portalStatusFilter);
    enriched = enriched.filter((item) => allowed.has(item.mcvPortalStatus));
  }

  sortVehicleDataAggregates(enriched, sort, dir);
  const total = enriched.length;
  const items = enriched.slice(offset, offset + limit);

  if (isAllScope) {
    return res.json({
      snapshot: null,
      reportScope: 'all',
      total,
      limit,
      offset,
      items,
      ...spreadAllScopeMeta(allScopeMeta),
    });
  }

  res.json({
    snapshot: {
      id: snapshot.id,
      reportDate: snapshot.reportDate,
      scrapedAt: snapshot.scrapedAt.toISOString(),
    },
    total,
    limit,
    offset,
    items,
  });
});

router.get('/vehicle-data/:vehicleRegNo', async (req, res) => {
  const prisma = getPrisma();
  const vehicleRegNo = normalizeVehicleRegNo(req.params.vehicleRegNo);
  if (!vehicleRegNo) {
    return res.status(400).json({ error: 'Invalid vehicle registration number' });
  }

  const isAllScope = req.query.reportScope === 'all';
  let snapshot = null;
  let passWhereBase;

  if (isAllScope) {
    const { snapshots } = await resolveSnapshotsForQuery(prisma, req.query);
    const snapshotIds = snapshots.map((s) => s.id);
    if (snapshotIds.length === 0) {
      return res.json({
        vehicleRegNo,
        snapshot: null,
        reportScope: 'all',
        summary: null,
        passes: [],
        vehicleStatus: null,
      });
    }
    passWhereBase = buildVehicleDataPassWhere(snapshotIds, req.query);
  } else {
    snapshot = await resolveSnapshot(prisma, req.query.snapshotId);
    if (!snapshot) {
      return res.json({
        vehicleRegNo,
        snapshot: null,
        summary: null,
        passes: [],
        vehicleStatus: null,
      });
    }
    passWhereBase = buildVehicleDataPassWhere(snapshot.id, req.query);
  }

  const where = {
    ...passWhereBase,
    vehicleRegNo: { equals: vehicleRegNo, mode: 'insensitive' },
  };

  const [passRows, vehicleStatusRow] = await Promise.all([
    prisma.epassChallanPassRow.findMany({
      where,
      orderBy: [{ transportedDate: 'desc' }, { slNo: 'asc' }],
      include: CHALLAN_PASS_LIST_INCLUDE,
    }),
    prisma.epassVehicleStatusRow.findUnique({
      where: { vehicleRegNo },
    }),
  ]);

  const aggMap = new Map();
  for (const row of passRows) {
    aggregatePassRow(aggMap, row);
  }
  const agg = aggMap.get(vehicleRegNo);
  let summary = agg ? mapVehicleDataAggregate(agg, Boolean(vehicleStatusRow)) : null;
  if (summary && vehicleStatusRow) {
    summary = {
      ...summary,
      grossWeightMt:
        vehicleStatusRow.grossWeightMt != null ? toNumber(vehicleStatusRow.grossWeightMt) : null,
      unladenWeightMt:
        vehicleStatusRow.unladenWeightMt != null
          ? toNumber(vehicleStatusRow.unladenWeightMt)
          : null,
    };
  } else if (summary) {
    summary = { ...summary, grossWeightMt: null, unladenWeightMt: null };
  }

  if (isAllScope) {
    return res.json({
      vehicleRegNo,
      snapshot: null,
      reportScope: 'all',
      summary,
      passes: passRows.map(mapChallanPassListItem),
      vehicleStatus: vehicleStatusRow ? mapVehicleStatusListItem(vehicleStatusRow) : null,
    });
  }

  res.json({
    vehicleRegNo,
    snapshot: {
      id: snapshot.id,
      reportDate: snapshot.reportDate,
      scrapedAt: snapshot.scrapedAt.toISOString(),
    },
    summary,
    passes: passRows.map(mapChallanPassListItem),
    vehicleStatus: vehicleStatusRow ? mapVehicleStatusListItem(vehicleStatusRow) : null,
  });
});

router.get(['/challans/:id/passes', '/chalaans/:id/passes'], async (req, res) => {
  const prisma = getPrisma();
  const challanRowId = req.params.id;

  const challanRow = await prisma.epassChallanRow.findUnique({
    where: { id: challanRowId },
    include: {
      consignerRow: {
        include: {
          districtRow: {
            include: { snapshot: { select: { id: true, reportDate: true, scrapedAt: true } } },
          },
        },
      },
    },
  });

  if (!challanRow) {
    return res.status(404).json({ error: 'Challan row not found' });
  }

  const passes = await prisma.epassChallanPassRow.findMany({
    where: { challanRowId },
    orderBy: { slNo: 'asc' },
  });

  const snapshot = challanRow.consignerRow.districtRow.snapshot;

  res.json({
    challan: mapChallan(challanRow),
    snapshot: snapshot
      ? {
          id: snapshot.id,
          reportDate: snapshot.reportDate,
          scrapedAt: snapshot.scrapedAt.toISOString(),
        }
      : null,
    items: passes.map(mapChallanPass),
  });
});

router.get(['/challans', '/chalaans'], async (req, res) => {
  const prisma = getPrisma();
  const snapshot = await resolveSnapshot(prisma, req.query.snapshotId);

  if (!snapshot) {
    return res.json({ snapshot: null, total: 0, limit: 50, offset: 0, items: [] });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = buildChallanBrowseWhere(snapshot.id, req.query);
  const orderBy = buildChallanBrowseOrderBy(req.query);

  const [total, rows] = await Promise.all([
    prisma.epassChallanRow.count({ where }),
    prisma.epassChallanRow.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        consignerRow: {
          include: { districtRow: { select: { dmoName: true, slNo: true } } },
        },
      },
    }),
  ]);

  res.json({
    snapshot: {
      id: snapshot.id,
      reportDate: snapshot.reportDate,
      scrapedAt: snapshot.scrapedAt.toISOString(),
    },
    total,
    limit,
    offset,
    items: rows.map(mapChallanListItem),
  });
});

router.get('/consigners/options', async (req, res) => {
  const prisma = getPrisma();

  if (isReportingReadModelEnabled()) {
    const started = Date.now();
    const payload = await fetchConsignerOptions(prisma, req.query);
    observeEpassQuery(
      'consigners/options',
      'all',
      (Date.now() - started) / 1000,
      payload.items.length,
      0,
    );
    return res.json({ snapshot: null, ...payload, items: payload.items });
  }

  const { snapshots } = await resolveSnapshotsForQuery(prisma, req.query);

  if (snapshots.length === 0) {
    return res.json({ snapshot: null, items: [] });
  }

  const snapshotIds = snapshots.map((s) => s.id);
  const where = buildConsignerWhereForSnapshots(snapshotIds, req.query);

  const consigners = await prisma.epassConsignerRow.findMany({
    where,
    orderBy: [{ districtRow: { dmoName: 'asc' } }, { operatorType: 'asc' }, { slNo: 'asc' }],
    take: 2000,
    include: {
      districtRow: {
        include: {
          snapshot: { select: { scrapedAt: true, reportDate: true } },
        },
      },
      _count: { select: { challans: true } },
      ...CONSIGNER_GHAT_CHALLAN_INCLUDE,
    },
  });

  const deduped = dedupeConsignerOptions(consigners);
  const meta = snapshots[0];
  const total = deduped.length;
  const truncated = total > 500;

  res.json({
    snapshot: {
      id: meta.id,
      reportDate: meta.reportDate,
      scrapedAt: meta.scrapedAt.toISOString(),
    },
    total,
    truncated,
    items: deduped.slice(0, 500).map((row) => {
      const { ghatNumber } = ghatFieldsFromConsigner(row);
      return {
        id: row.id,
        consignerName: row.consignerName,
        dmoName: row.districtRow.dmoName,
        operatorType: row.operatorType,
        role: row.operatorType,
        challanCount: row.challanCount,
        challanLineCount: row._count.challans,
        ghatNumber,
      };
    }),
  });
});

router.get('/consigners', async (req, res) => {
  const prisma = getPrisma();
  const isAllScope = req.query.reportScope === 'all';
  const dateMode = req.query.dateMode === 'range' ? 'range' : 'specific';
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const orderBy = buildConsignerOrderBy(req.query);

  if (isReportingReadModelEnabled() && (isAllScope || dateMode === 'range')) {
    const rangeError = validateReportingQuery(req.query);
    if (rangeError) return res.status(400).json({ error: rangeError });
    const started = Date.now();
    const payload = await fetchConsignerList(prisma, req.query);
    observeEpassQuery(
      'consigners',
      isAllScope ? 'all' : 'range',
      (Date.now() - started) / 1000,
      payload.items.length,
      0,
    );
    return res.json(payload);
  }

  if (isAllScope) {
    const { snapshots, allScopeMeta } = await resolveSnapshotsForQuery(prisma, req.query);
    const snapshotIds = snapshots.map((s) => s.id);
    if (snapshotIds.length === 0) {
      return res.json({
        snapshot: null,
        reportScope: 'all',
        snapshotCount: 0,
        totalSnapshotCount: 0,
        snapshotsTruncated: false,
        latestScrapedAt: null,
        total: 0,
        limit,
        offset,
        items: [],
      });
    }

    const where = buildConsignerWhereForSnapshots(snapshotIds, req.query);
    const allMatching = await prisma.epassConsignerRow.findMany({
      where,
      orderBy,
      include: {
        districtRow: {
          include: { snapshot: { select: { scrapedAt: true } } },
        },
        _count: { select: { challans: true } },
        ...CONSIGNER_GHAT_CHALLAN_INCLUDE,
      },
    });

    const merged = mergeConsignerRecordsForAllScope(allMatching);
    const page = merged.slice(offset, offset + limit);
    const latestScrapedAt = latestScrapedAtFromSnapshots(snapshots);

    return res.json({
      snapshot: null,
      reportScope: 'all',
      latestScrapedAt: latestScrapedAt?.toISOString() ?? null,
      total: merged.length,
      limit,
      offset,
      items: page.map(mapConsignerListItem),
      ...spreadAllScopeMeta(allScopeMeta),
    });
  }

  const snapshot = await resolveSnapshot(prisma, req.query.snapshotId);

  if (!snapshot) {
    return res.json({ snapshot: null, total: 0, limit, offset, items: [] });
  }

  const where = buildConsignerWhere(snapshot.id, req.query);

  const allMatching = await prisma.epassConsignerRow.findMany({
    where,
    orderBy,
    include: {
      districtRow: { select: { dmoName: true, slNo: true } },
      _count: { select: { challans: true } },
      ...CONSIGNER_GHAT_CHALLAN_INCLUDE,
    },
  });

  const deduped = dedupeConsignerRecords(allMatching);
  const page = deduped.slice(offset, offset + limit);

  res.json({
    snapshot: {
      id: snapshot.id,
      reportDate: snapshot.reportDate,
      scrapedAt: snapshot.scrapedAt.toISOString(),
    },
    total: deduped.length,
    limit,
    offset,
    items: page.map(mapConsignerListItem),
  });
});

router.get('/consigners/:id/challans', async (req, res) => {
  const prisma = getPrisma();
  const consigner = await prisma.epassConsignerRow.findUnique({
    where: { id: req.params.id },
    include: { districtRow: { include: { snapshot: true } } },
  });

  if (!consigner) {
    return res.status(404).json({ error: 'Consigner row not found' });
  }

  const dateMode = req.query.dateMode === 'range' ? 'range' : 'specific';
  const isAllScope = req.query.reportScope === 'all';

  if (isReportingReadModelEnabled()) {
    const started = Date.now();
    const payload = await fetchConsigneeChallans(prisma, consigner.id, req.query);
    observeEpassQuery(
      'consigners/challans',
      isAllScope ? 'all' : dateMode === 'range' ? 'range' : 'specific',
      (Date.now() - started) / 1000,
      payload.items.length,
      0,
    );
    return res.json({
      consigner: mapConsigner(consigner),
      districtRow: payload.districtRow,
      snapshot: payload.snapshot,
      truncated: payload.truncated,
      incompleteScrape: payload.incompleteScrape,
      items: payload.items,
    });
  }
  const useRange =
    !isAllScope &&
    dateMode === 'range' &&
    (typeof req.query.dateFrom === 'string' || typeof req.query.dateTo === 'string');

  let consignerRowIds = [consigner.id];

  if (isAllScope || useRange) {
    const { snapshots } = await resolveSnapshotsForQuery(prisma, req.query);
    const snapshotIds = snapshots.map((s) => s.id);
    if (snapshotIds.length > 0) {
      const siblings = await prisma.epassConsignerRow.findMany({
        where: {
          snapshotId: { in: snapshotIds },
          consignerName: consigner.consignerName,
          operatorType: consigner.operatorType,
          districtRow: { dmoName: consigner.districtRow.dmoName },
        },
        select: { id: true },
      });
      consignerRowIds = siblings.map((r) => r.id);
    }
  }

  const challanWhere = buildConsignerChallansWhere(consignerRowIds, req.query);

  const challans = await prisma.epassChallanRow.findMany({
    where: challanWhere,
    orderBy: [
      { consignerRow: { districtRow: { snapshot: { reportDate: 'asc' } } } },
      { slNo: 'asc' },
    ],
    take: CONSIGNER_CHALLAN_RAW_CAP,
    include: {
      _count: { select: { passes: true } },
      consignerRow: {
        include: { districtRow: { include: { snapshot: true } } },
      },
    },
  });

  const truncated = challans.length >= CONSIGNER_CHALLAN_RAW_CAP;
  const items = challans.map(mapChallan);

  res.json({
    consigner: mapConsigner(consigner),
    districtRow: {
      dmoName: consigner.districtRow.dmoName,
      slNo: consigner.districtRow.slNo,
    },
    snapshot: {
      reportDate: consigner.districtRow.snapshot.reportDate,
    },
    truncated,
    incompleteScrape: challanRowsIncompleteScrape(items),
    items,
  });
});

async function updateLesseeGhatNumber(prisma, consignerRowId, ghatNumber) {
  const consigner = await prisma.epassConsignerRow.findUnique({
    where: { id: consignerRowId },
    include: {
      districtRow: { include: { snapshot: true } },
      _count: { select: { challans: true } },
    },
  });
  if (!consigner) {
    return { status: 404, error: 'Consigner row not found' };
  }
  if (consigner.operatorType !== 'lessee') {
    return { status: 400, error: 'Ghat number can be set only for Lessee rows' };
  }

  const updated = await prisma.epassConsignerRow.update({
    where: { id: consigner.id },
    data: { ghatNumber: ghatNumber || null },
    include: {
      districtRow: { select: { dmoName: true, slNo: true } },
      _count: { select: { challans: true } },
      ...CONSIGNER_GHAT_CHALLAN_INCLUDE,
    },
  });
  return { status: 200, item: mapConsignerListItem(updated) };
}

router.patch('/consigners/:id/ghat-number', async (req, res) => {
  const prisma = getPrisma();
  const rawGhat = typeof req.body?.ghatNumber === 'string' ? req.body.ghatNumber : '';
  const ghatNumber = rawGhat.trim();
  if (ghatNumber.length > 64) {
    return res.status(400).json({ error: 'Ghat number is too long' });
  }

  const result = await updateLesseeGhatNumber(prisma, req.params.id, ghatNumber);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json({ item: result.item });
});

router.patch('/challans/:id/ghat-number', async (req, res) => {
  const prisma = getPrisma();
  const rawGhat = typeof req.body?.ghatNumber === 'string' ? req.body.ghatNumber : '';
  const ghatNumber = rawGhat.trim();
  if (ghatNumber.length > 64) {
    return res.status(400).json({ error: 'Ghat number is too long' });
  }

  const challan = await prisma.epassChallanRow.findUnique({
    where: { id: req.params.id },
    select: { consignerRowId: true },
  });
  if (!challan) {
    return res.status(404).json({ error: 'Challan row not found' });
  }

  const result = await updateLesseeGhatNumber(prisma, challan.consignerRowId, ghatNumber);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json({ item: result.item });
});

router.get('/vehicle-status', async (req, res) => {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const includeCrm = req.query.includeCrm === '1' || req.query.includeCrm === 'true';

  const [pageResult, stats, crmLookup] = await Promise.all([
    fetchVehicleStatusPage(prisma, req.query, { limit, offset }),
    fetchVehicleStatusGlobalStats(prisma),
    includeCrm ? loadCrmLookupSets(prisma) : Promise.resolve(null),
  ]);

  const items = pageResult.rows.map((row) => {
    const item = mapVehicleStatusListItem(row);
    if (!crmLookup) return item;
    const inCrmManual = crmLookup.manualActive.has(row.vehicleRegNo);
    const suppressed = crmLookup.suppressed.has(row.vehicleRegNo);
    const autoQualifies =
      !suppressed &&
      ((item.insuranceDaysLeft != null && item.insuranceDaysLeft <= 30) ||
        (item.rcDaysLeft != null && item.rcDaysLeft <= 30) ||
        (item.fitnessDaysLeft != null && item.fitnessDaysLeft <= 30));
    return { ...item, inCrm: inCrmManual || autoQualifies };
  });

  res.json({
    total: pageResult.total,
    limit,
    offset,
    items,
    stats,
  });
});

router.post('/vehicle-status/enqueue', async (req, res) => {
  const prisma = getPrisma();
  const vehicleRegNo = normalizeVehicleRegNo(req.body?.vehicleRegNo);
  if (!vehicleRegNo) {
    return res.status(400).json({ error: 'vehicleRegNo is required' });
  }

  const fanout = await enqueueVehicleStatusJobs(prisma, [vehicleRegNo], 'vehicle-data-ui');
  res.json({ vehicleRegNo, ...fanout });
});

router.post('/vehicle-status/scrape-missing', async (req, res) => {
  const prisma = getPrisma();
  const rawLimit = Number(req.query.limit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : undefined;

  const passCount = await prisma.epassChallanPassRow.count({
    where: { vehicleRegNo: { not: null } },
  });
  const statusCount = await prisma.epassVehicleStatusRow.count();
  const fanout = await enqueueMissingVehicleStatusFromPasses(prisma, { limit });
  res.json({
    passRowsWithVehicle: passCount,
    existingStatusRows: statusCount,
    limit: limit ?? null,
    ...fanout,
  });
});

function wrapRouterAsyncHandlers(router) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const routeLayer of layer.route.stack) {
      const fn = routeLayer.handle;
      if (fn.length === 3) {
        routeLayer.handle = asyncHandler(fn);
      }
    }
  }
  return router;
}

wrapRouterAsyncHandlers(router);

export default router;
