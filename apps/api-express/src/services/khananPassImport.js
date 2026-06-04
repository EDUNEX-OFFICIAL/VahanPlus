import { enqueueVehicleStatusJobs } from '@vahanplus/epass-orchestrator';
import { normalizeVehicleRegNo, parsePortalReportDate } from '@vahanplus/scraper-bihar-epass';

export const KHANAN_PASS_REQUIRED = [
  'vehicleRegNo',
  'district',
  'consignerName',
  'challanNo',
  'date',
];

export const KHANAN_PASS_ALIASES = {
  district: ['district', 'dmo', 'dmoname', 'dmo name'],
  consignerName: ['consignername', 'consigner'],
  date: ['date', 'reportdate', 'report date'],
  sourceType: ['sourcetype', 'operator', 'role'],
  consigneeName: ['consigneename', 'consignee'],
  challanNo: ['challanno', 'challan'],
  mineralName: ['mineralname', 'mineral'],
  mineralCategory: ['mineralcategory', 'category'],
  vehicleRegNo: ['vehicleregno', 'vrn', 'registration', 'vehicle reg no'],
  destination: ['destination'],
  transportedDate: ['transporteddate', 'pass date', 'passdate'],
  quantity: ['quantity', 'qty'],
  unit: ['unit'],
  checkStatus: ['checkstatus', 'status'],
};

const CHUNK_SIZE = 500;

/**
 * @param {string} header
 */
function normalizeHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string[]} headers
 * @param {Record<string, string[]>} aliases
 * @param {string[]} required
 */
export function buildKhananPassMapping(headers, aliases, required) {
  const mapping = {};
  const errors = [];
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const [field, aliasList] of Object.entries(aliases)) {
    const targets = new Set([normalizeHeader(field), ...aliasList.map(normalizeHeader)]);
    const match = normalized.find((h) => targets.has(h.norm));
    if (match) mapping[field] = match.raw;
  }

  for (const req of required) {
    if (!mapping[req]) {
      errors.push(`Missing required column for ${req}`);
    }
  }

  return { mapping, errors };
}

/**
 * @param {string | undefined} raw
 */
export function mapSourceTypeToOperator(raw) {
  const v = (raw ?? 'lessee').trim().toLowerCase();
  if (v === 'dealer') return 'dealer';
  return 'lessee';
}

/**
 * @param {Record<string, string>} row
 * @param {Record<string, string>} mapping
 */
export function pickKhananMapped(row, mapping) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (header && row[header] != null) out[field] = String(row[header]).trim();
  }
  return out;
}

function parseQty(value) {
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function makeBatchId() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  return `import-${stamp}`;
}

/**
 * @param {Record<string, string>[]} rows
 * @param {Record<string, string>} mapping
 */
export function buildKhananPassAnalyzeStats(rows, mapping) {
  const dates = new Set();
  const vrns = new Set();
  let unparseableDates = 0;
  let blankVrn = 0;

  for (const row of rows) {
    const m = pickKhananMapped(row, mapping);
    const iso = parsePortalReportDate(m.date ?? '');
    if (m.date && !iso) unparseableDates += 1;
    if (iso) dates.add(iso);
    const vrn = normalizeVehicleRegNo(m.vehicleRegNo);
    if (!vrn) blankVrn += 1;
    else vrns.add(vrn);
  }

  const warnings = [];
  if (unparseableDates > 0) {
    warnings.push(`${unparseableDates} row(s) have unparseable date values.`);
  }
  if (blankVrn > 0) {
    warnings.push(`${blankVrn} row(s) have blank VRN.`);
  }

  const dateList = [...dates].sort();
  return {
    distinctDates: { count: dates.size, sample: dateList.slice(0, 5) },
    distinctVrns: vrns.size,
    warnings,
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {{
 *   rows: Record<string, string>[],
 *   mapping: Record<string, string>,
 *   replaceExisting?: boolean,
 *   refreshVehicleStatus?: boolean,
 * }} input
 */
export async function commitKhananPassImport(prisma, input) {
  const { rows, mapping } = input;
  const replaceExisting = Boolean(input.replaceExisting);
  const refreshVehicleStatus = Boolean(input.refreshVehicleStatus);
  const batchId = makeBatchId();
  const warnings = [];

  /** @type {{ row: Record<string, string>, isoDate: string, m: Record<string, string> }[]} */
  const parsed = [];
  let skippedBadDate = 0;

  for (const row of rows) {
    const m = pickKhananMapped(row, mapping);
    if (!m.district || !m.consignerName || !m.challanNo) continue;
    const isoDate = parsePortalReportDate(m.date ?? '');
    if (!isoDate) {
      skippedBadDate += 1;
      continue;
    }
    parsed.push({ row, isoDate, m });
  }

  if (skippedBadDate > 0) {
    warnings.push(`Skipped ${skippedBadDate} row(s) with unparseable date.`);
  }
  if (parsed.length === 0) {
    throw new Error('No valid pass rows after date parsing');
  }

  /** @type {Map<string, typeof parsed>} */
  const byDate = new Map();
  for (const item of parsed) {
    const list = byDate.get(item.isoDate) ?? [];
    list.push(item);
    byDate.set(item.isoDate, list);
  }

  if (replaceExisting) {
    const reportDates = [...byDate.keys()];
    await prisma.epassSnapshot.deleteMany({
      where: { reportDate: { in: reportDates }, sourceUrl: 'import' },
    });
  }

  const vrns = new Set();
  let passesImported = 0;
  let snapshotsCreated = 0;
  let scrapeOffset = 0;
  const now = new Date();

  for (const [isoDate, dateRows] of byDate) {
    const snapshot = await prisma.epassSnapshot.create({
      data: {
        reportDate: isoDate,
        reportGeneratedOn: batchId,
        sourceUrl: 'import',
        scrapedAt: new Date(now.getTime() + scrapeOffset++),
      },
    });
    snapshotsCreated += 1;

    const caches = {
      district: new Map(),
      consigner: new Map(),
      challan: new Map(),
      passSlNo: new Map(),
      districtSlNo: 0,
      consignerSlNo: new Map(),
      challanSlNo: new Map(),
    };

    for (let i = 0; i < dateRows.length; i += CHUNK_SIZE) {
      const chunk = dateRows.slice(i, i + CHUNK_SIZE);
      for (const { m } of chunk) {
        const districtRow = await getOrCreateDistrict(prisma, snapshot.id, m.district, caches);
        const operatorType = mapSourceTypeToOperator(m.sourceType);
        const consignerRow = await getOrCreateConsigner(
          prisma,
          snapshot.id,
          districtRow,
          operatorType,
          m.consignerName,
          m.mineralName,
          caches,
        );
        const qty = parseQty(m.quantity);
        const { challanRow, isNew: newChallan } = await getOrCreateChallan(
          prisma,
          consignerRow,
          m.consigneeName || '—',
          m.challanNo,
          m.mineralName,
          m.mineralCategory,
          m.unit,
          caches,
        );

        if (newChallan) {
          await prisma.epassConsignerRow.update({
            where: { id: consignerRow.id },
            data: { challanCount: { increment: 1 } },
          });
        }

        const passSlNo = (caches.passSlNo.get(challanRow.id) ?? 0) + 1;
        caches.passSlNo.set(challanRow.id, passSlNo);

        const vehicleRegNo = normalizeVehicleRegNo(m.vehicleRegNo);
        if (vehicleRegNo) vrns.add(vehicleRegNo);

        await prisma.epassChallanPassRow.create({
          data: {
            challanRowId: challanRow.id,
            slNo: passSlNo,
            consigneeName: m.consigneeName || '—',
            challanNo: m.challanNo,
            mineral: m.mineralName || null,
            mineralCategory: m.mineralCategory || null,
            vehicleRegNo,
            destination: m.destination || null,
            transportedDate: m.transportedDate || null,
            quantity: qty,
            unit: m.unit || null,
            checkStatus: m.checkStatus || null,
            scrapedAt: now,
          },
        });

        await prisma.epassChallanRow.update({
          where: { id: challanRow.id },
          data: {
            challanCount: { increment: 1 },
            dispatchedQty: { increment: qty },
          },
        });

        passesImported += 1;
      }
    }
  }

  const fanout = await enqueueVehicleStatusJobs(prisma, [...vrns], batchId, {
    refreshAll: refreshVehicleStatus,
  });

  return {
    batchId,
    snapshotsCreated,
    passesImported,
    vrnsQueued: fanout.enqueued ?? 0,
    vrnsSkippedExisting: fanout.skippedExisting ?? 0,
    fanoutSkipped: fanout.skipped ?? false,
    warnings,
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} snapshotId
 * @param {string} dmoName
 * @param {{
 *   district: Map<string, import('@vahanplus/db').EpassDistrictRow>,
 *   districtSlNo: number,
 * }} caches
 */
async function getOrCreateDistrict(prisma, snapshotId, dmoName, caches) {
  const key = `${snapshotId}|${dmoName}`;
  if (caches.district.has(key)) return caches.district.get(key);

  caches.districtSlNo += 1;
  const row = await prisma.epassDistrictRow.create({
    data: {
      snapshotId,
      slNo: caches.districtSlNo,
      dmoName,
      lesseeUsers: 0,
      lesseePasses: 0,
      lesseeDispatchedQty: 0,
      dealerUsers: 0,
      dealerPasses: 0,
      dealerDispatchedQty: 0,
      totalUsers: 0,
      totalPasses: 0,
    },
  });
  caches.district.set(key, row);
  return row;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} snapshotId
 * @param {import('@vahanplus/db').EpassDistrictRow} districtRow
 * @param {'lessee' | 'dealer'} operatorType
 * @param {string} consignerName
 * @param {string | undefined} mineral
 * @param {*} caches
 */
async function getOrCreateConsigner(
  prisma,
  snapshotId,
  districtRow,
  operatorType,
  consignerName,
  mineral,
  caches,
) {
  const key = `${districtRow.id}|${operatorType}|${consignerName}`;
  if (caches.consigner.has(key)) return caches.consigner.get(key);

  const consignerKey = `${districtRow.id}|${operatorType}`;
  const nextSl = (caches.consignerSlNo.get(consignerKey) ?? 0) + 1;
  caches.consignerSlNo.set(consignerKey, nextSl);

  const row = await prisma.epassConsignerRow.create({
    data: {
      districtRowId: districtRow.id,
      snapshotId,
      operatorType,
      slNo: nextSl,
      consignerName,
      mineral: mineral || null,
      challanCount: 0,
    },
  });
  caches.consigner.set(key, row);
  return row;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {import('@vahanplus/db').EpassConsignerRow} consignerRow
 * @param {string} consigneeName
 * @param {string} challanNo
 * @param {string | undefined} mineral
 * @param {string | undefined} mineralCategory
 * @param {string | undefined} unit
 * @param {*} caches
 */
async function getOrCreateChallan(
  prisma,
  consignerRow,
  consigneeName,
  challanNo,
  mineral,
  mineralCategory,
  unit,
  caches,
) {
  const key = `${consignerRow.id}|${consigneeName}|${challanNo}`;
  if (caches.challan.has(key)) {
    return { challanRow: caches.challan.get(key), isNew: false };
  }

  const nextSl = (caches.challanSlNo.get(consignerRow.id) ?? 0) + 1;
  caches.challanSlNo.set(consignerRow.id, nextSl);

  const row = await prisma.epassChallanRow.create({
    data: {
      consignerRowId: consignerRow.id,
      slNo: nextSl,
      consigneeName,
      mineral: mineral || null,
      mineralCategory: mineralCategory || null,
      challanCount: 0,
      dispatchedQty: 0,
      unit: unit || null,
    },
  });
  caches.challan.set(key, row);
  return { challanRow: row, isNew: true };
}
