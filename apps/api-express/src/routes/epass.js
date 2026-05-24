import express from 'express';
import { getPrisma } from '@vahanplus/db';
import { requireAuth } from '../middleware/auth.js';
import {
  enqueueChallanPassJobs,
  enqueueConsignerJobsForSnapshot,
  enqueueMissingVehicleStatusFromPasses,
} from '@vahanplus/epass-orchestrator';

const router = express.Router();

router.use(requireAuth);

function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
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

function mapConsigner(row) {
  const operatorType = row.operatorType;
  return {
    id: row.id,
    districtRowId: row.districtRowId,
    snapshotId: row.snapshotId,
    operatorType,
    role: operatorType,
    slNo: row.slNo,
    consignerName: row.consignerName,
    mineral: row.mineral,
    mineralType: row.mineralType,
    challanCount: row.challanCount,
    challanDetailUrl: row.challanDetailUrl,
    scrapedAt: row.scrapedAt.toISOString(),
    challanLineCount: row._count?.challans ?? 0,
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

function dedupeConsignerRecords(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = consignerDedupeKey(row);
    const prev = byKey.get(key);
    byKey.set(key, prev ? preferConsignerRecord(prev, row) : row);
  }
  return [...byKey.values()];
}

async function resolveSnapshot(prisma, snapshotId) {
  if (snapshotId) {
    return prisma.epassSnapshot.findUnique({ where: { id: snapshotId } });
  }
  return prisma.epassSnapshot.findFirst({ orderBy: { scrapedAt: 'desc' } });
}

const REPORT_MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseReportDate(value) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(value).trim());
  if (!m) return null;
  const month = REPORT_MONTHS[m[2].toLowerCase()];
  const day = Number(m[1]);
  const year = Number(m[3]);
  if (month == null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

function parseIsoDateInput(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isReportDateInRange(reportDate, fromIso, toIso) {
  const from = fromIso ? parseIsoDateInput(fromIso) : null;
  const to = toIso ? parseIsoDateInput(toIso) : null;
  if (!from && !to) return true;
  const d = parseReportDate(reportDate);
  if (!d) return false;
  if (from && d < from) return false;
  if (to) {
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

async function resolveSnapshotsForQuery(prisma, query) {
  const all = await prisma.epassSnapshot.findMany({
    orderBy: { scrapedAt: 'desc' },
    take: 100,
  });
  const dateMode = query.dateMode === 'range' ? 'range' : 'specific';

  if (dateMode === 'range') {
    const from = typeof query.dateFrom === 'string' ? query.dateFrom : '';
    const to = typeof query.dateTo === 'string' ? query.dateTo : query.dateFrom || '';
    if (!from && !to) return all;
    return all.filter((s) => isReportDateInRange(s.reportDate, from || null, to || null));
  }

  if (query.snapshotId) {
    const one = all.find((s) => s.id === query.snapshotId);
    return one ? [one] : [];
  }

  return all.length > 0 ? [all[0]] : [];
}

function buildConsignerWhereForSnapshots(snapshotIds, query) {
  const where = { snapshotId: { in: snapshotIds } };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    where.operatorType = operatorType;
  }
  const consigner = typeof query.consigner === 'string' ? query.consigner.trim() : '';
  if (consigner) {
    where.consignerName = { contains: consigner, mode: 'insensitive' };
  }
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
  const consigner = typeof query.consigner === 'string' ? query.consigner.trim() : '';
  if (consigner) {
    where.consignerName = { contains: consigner, mode: 'insensitive' };
  }
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
  return {
    id: row.id,
    consignerRowId: row.consignerRowId,
    slNo: row.slNo,
    reportDate,
    consigneeName: row.consigneeName,
    mineral: row.mineral,
    mineralCategory: row.mineralCategory,
    challanCount: row.challanCount,
    dispatchedQty: toNumber(row.dispatchedQty),
    unit: row.unit,
    detailUrl: row.detailUrl,
    scrapedAt: row.scrapedAt.toISOString(),
  };
}

function mapChalaanListItem(row) {
  const { consignerRow } = row;
  return {
    ...mapChallan(row),
    consignerName: consignerRow.consignerName,
    operatorType: consignerRow.operatorType,
    role: consignerRow.operatorType,
    dmoName: consignerRow.districtRow.dmoName,
    districtSlNo: consignerRow.districtRow.slNo,
  };
}

function buildChalaanWhere(snapshotId, query) {
  const consignerRow = { snapshotId };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    consignerRow.operatorType = operatorType;
  }

  const dmo = typeof query.dmo === 'string' ? query.dmo.trim() : '';
  const consigner = typeof query.consigner === 'string' ? query.consigner.trim() : '';
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

  if (consigner) {
    consignerRow.consignerName = { contains: consigner, mode: 'insensitive' };
  }

  const where = { consignerRow };
  const consignee = typeof query.consignee === 'string' ? query.consignee.trim() : '';
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

function buildChalaanOrderBy(query) {
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

function buildChalaanPassWhere(snapshotId, query) {
  const consignerRow = { snapshotId };
  const operatorType = parseOperatorFromQuery(query);
  if (operatorType) {
    consignerRow.operatorType = operatorType;
  }

  const dmo = typeof query.dmo === 'string' ? query.dmo.trim() : '';
  const consigner = typeof query.consigner === 'string' ? query.consigner.trim() : '';
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

  if (consigner) {
    consignerRow.consignerName = { contains: consigner, mode: 'insensitive' };
  }

  const where = { challanRow: { consignerRow } };

  const consignee = typeof query.consignee === 'string' ? query.consignee.trim() : '';
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
    where.quantity = { gt: 0 };
  }

  return where;
}

function buildChalaanPassOrderBy(query) {
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

function mapChalaanPassListItem(row) {
  const { challanRow } = row;
  const { consignerRow } = challanRow;
  return {
    ...mapChallanPass(row),
    consignerRowId: consignerRow.id,
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
  const lessee = consignerCounts.get(lesseeKey) ?? { consigners: 0, challans: 0, challanExpected: 0 };
  const dealer = consignerCounts.get(dealerKey) ?? { consigners: 0, challans: 0, challanExpected: 0 };

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
    include: { _count: { select: { challans: true } } },
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
    mineral: row.mineral,
    mineralCategory: row.mineralCategory,
    vehicleRegNo: row.vehicleRegNo,
    destination: row.destination,
    transportedDate: row.transportedDate,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    checkStatus: row.checkStatus,
    portalChallanUrl: row.portalChallanUrl,
    scrapedAt: row.scrapedAt.toISOString(),
  };
}

router.get('/chalaan-passes', async (req, res) => {
  const prisma = getPrisma();
  const snapshot = await resolveSnapshot(prisma, req.query.snapshotId);

  if (!snapshot) {
    return res.json({ snapshot: null, total: 0, limit: 50, offset: 0, items: [] });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = buildChalaanPassWhere(snapshot.id, req.query);
  const orderBy = buildChalaanPassOrderBy(req.query);

  const [total, rows] = await Promise.all([
    prisma.epassChallanPassRow.count({ where }),
    prisma.epassChallanPassRow.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        challanRow: {
          select: {
            detailUrl: true,
            consignerRowId: true,
            consignerRow: {
              select: {
                id: true,
                operatorType: true,
                consignerName: true,
                districtRow: { select: { dmoName: true } },
              },
            },
          },
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
    items: rows.map(mapChalaanPassListItem),
  });
});

router.get('/chalaans/:id/passes', async (req, res) => {
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

router.get('/chalaans', async (req, res) => {
  const prisma = getPrisma();
  const snapshot = await resolveSnapshot(prisma, req.query.snapshotId);

  if (!snapshot) {
    return res.json({ snapshot: null, total: 0, limit: 50, offset: 0, items: [] });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = buildChalaanWhere(snapshot.id, req.query);
  const orderBy = buildChalaanOrderBy(req.query);

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
    items: rows.map(mapChalaanListItem),
  });
});

router.get('/consigners/options', async (req, res) => {
  const prisma = getPrisma();
  const snapshots = await resolveSnapshotsForQuery(prisma, req.query);

  if (snapshots.length === 0) {
    return res.json({ snapshot: null, items: [] });
  }

  const snapshotIds = snapshots.map((s) => s.id);
  const where = buildConsignerWhereForSnapshots(snapshotIds, req.query);

  const consigners = await prisma.epassConsignerRow.findMany({
    where,
    orderBy: [
      { districtRow: { dmoName: 'asc' } },
      { operatorType: 'asc' },
      { slNo: 'asc' },
    ],
    take: 2000,
    include: {
      districtRow: {
        include: {
          snapshot: { select: { scrapedAt: true, reportDate: true } },
        },
      },
      _count: { select: { challans: true } },
    },
  });

  const deduped = dedupeConsignerOptions(consigners);
  const meta = snapshots[0];

  res.json({
    snapshot: {
      id: meta.id,
      reportDate: meta.reportDate,
      scrapedAt: meta.scrapedAt.toISOString(),
    },
    items: deduped.slice(0, 500).map((row) => ({
      id: row.id,
      consignerName: row.consignerName,
      dmoName: row.districtRow.dmoName,
      operatorType: row.operatorType,
      role: row.operatorType,
      challanCount: row.challanCount,
      challanLineCount: row._count.challans,
    })),
  });
});

router.get('/consigners', async (req, res) => {
  const prisma = getPrisma();
  const snapshot = await resolveSnapshot(prisma, req.query.snapshotId);

  if (!snapshot) {
    return res.json({ snapshot: null, total: 0, items: [] });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = buildConsignerWhere(snapshot.id, req.query);

  const orderBy = buildConsignerOrderBy(req.query);

  const allMatching = await prisma.epassConsignerRow.findMany({
    where,
    orderBy,
    include: {
      districtRow: { select: { dmoName: true, slNo: true } },
      _count: { select: { challans: true } },
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
  const useRange =
    dateMode === 'range' &&
    (typeof req.query.dateFrom === 'string' || typeof req.query.dateTo === 'string');

  let consignerRowIds = [consigner.id];

  if (useRange) {
    const snapshots = await resolveSnapshotsForQuery(prisma, req.query);
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

  const challanWhere = { consignerRowId: { in: consignerRowIds } };
  const consignee = typeof req.query.consignee === 'string' ? req.query.consignee.trim() : '';
  if (consignee) {
    challanWhere.consigneeName = { contains: consignee, mode: 'insensitive' };
  }
  if (req.query.hideZeroPasses === '1') {
    challanWhere.challanCount = { gt: 0 };
  }

  const challans = await prisma.epassChallanRow.findMany({
    where: challanWhere,
    orderBy: [
      { consignerRow: { districtRow: { snapshot: { reportDate: 'asc' } } } },
      { slNo: 'asc' },
    ],
    include: {
      consignerRow: {
        include: { districtRow: { include: { snapshot: true } } },
      },
    },
  });

  res.json({
    consigner: mapConsigner(consigner),
    districtRow: {
      dmoName: consigner.districtRow.dmoName,
      slNo: consigner.districtRow.slNo,
    },
    snapshot: {
      reportDate: consigner.districtRow.snapshot.reportDate,
    },
    items: challans.map(mapChallan),
  });
});

function buildVehicleStatusWhere(query) {
  const where = {};
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q) {
    where.OR = [
      { vehicleRegNo: { contains: q, mode: 'insensitive' } },
      { ksRegNo: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (query.found === '0' || query.found === 'false') {
    where.found = false;
  } else if (query.found === '1' || query.found === 'true') {
    where.found = true;
  }
  return where;
}

function buildVehicleStatusOrderBy(query) {
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  const sort = typeof query.sort === 'string' ? query.sort : 'vehicleRegNo';
  const map = {
    vehicleRegNo: { vehicleRegNo: dir },
    ksRegNo: { ksRegNo: dir },
    vehicleClass: { vehicleClass: dir },
    rcFitUpTo: { rcFitUpTo: dir },
    rcTaxUpTo: { rcTaxUpTo: dir },
    insuranceUpTo: { insuranceUpTo: dir },
    puccUpTo: { puccUpTo: dir },
    imeiNo: { imeiNo: dir },
    esimValidity: { esimValidity: dir },
    grossWeightMt: { grossWeightMt: dir },
    unladenWeightMt: { unladenWeightMt: dir },
    scrapedAt: { scrapedAt: dir },
  };
  return map[sort] ?? { vehicleRegNo: dir };
}

function mapVehicleStatusListItem(row) {
  return {
    id: row.id,
    vehicleRegNo: row.vehicleRegNo,
    ksRegNo: row.ksRegNo,
    vehicleClass: row.vehicleClass,
    rcFitUpTo: row.rcFitUpTo,
    rcTaxUpTo: row.rcTaxUpTo,
    insuranceUpTo: row.insuranceUpTo,
    puccUpTo: row.puccUpTo,
    imeiNo: row.imeiNo,
    esimValidity: row.esimValidity,
    grossWeightMt: row.grossWeightMt != null ? toNumber(row.grossWeightMt) : null,
    unladenWeightMt: row.unladenWeightMt != null ? toNumber(row.unladenWeightMt) : null,
    found: row.found,
    scrapedAt: row.scrapedAt.toISOString(),
  };
}

router.get('/vehicle-status', async (req, res) => {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = buildVehicleStatusWhere(req.query);
  const orderBy = buildVehicleStatusOrderBy(req.query);

  const [total, rows, statsTotal, statsFound, statsNotFound, latestRow] = await Promise.all([
    prisma.epassVehicleStatusRow.count({ where }),
    prisma.epassVehicleStatusRow.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.epassVehicleStatusRow.count(),
    prisma.epassVehicleStatusRow.count({ where: { found: true } }),
    prisma.epassVehicleStatusRow.count({ where: { found: false } }),
    prisma.epassVehicleStatusRow.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { scrapedAt: true },
    }),
  ]);

  res.json({
    total,
    limit,
    offset,
    items: rows.map(mapVehicleStatusListItem),
    stats: {
      total: statsTotal,
      found: statsFound,
      notFound: statsNotFound,
      lastScrapedAt: latestRow?.scrapedAt?.toISOString() ?? null,
    },
  });
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

export default router;
