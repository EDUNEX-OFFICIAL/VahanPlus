import { enqueueVehicleStatusJobs } from '@vahanplus/epass-orchestrator';
import { normalizeVehicleRegNo, parsePortalReportDate } from '@vahanplus/scraper-bihar-epass';
import { mapSourceTypeToOperator } from './mapping.js';

const CHUNK_SIZE = 500;

export function makeImportBatchId() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  return `import-${stamp}`;
}

function parseQty(value) {
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function canonicalTransportDate(value) {
  const source = String(value ?? '').trim();
  if (!source) return '';
  const iso = parsePortalReportDate(source);
  if (iso) return iso;
  const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(source);
  if (dmyDash) {
    const day = Number(dmyDash[1]);
    const month = Number(dmyDash[2]);
    const year = Number(dmyDash[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const parsed = Date.parse(source);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return source.toLowerCase();
}

function normalizeConsigneeName(name) {
  return (name ?? '—').trim().toLowerCase();
}

function passImportDedupeKey(m, vehicleRegNo, qty) {
  return [
    (m.challanNo ?? '').toLowerCase(),
    (vehicleRegNo ?? '').toLowerCase(),
    canonicalTransportDate(m.transportedDate),
    (m.destination ?? '').toLowerCase(),
    String(qty),
    (m.unit ?? '').toLowerCase(),
    (m.mineralName ?? '').toLowerCase(),
    (m.checkStatus ?? '').toLowerCase(),
    (m.consigneeName ?? '—').toLowerCase(),
  ].join('|');
}

/**
 * Streaming-friendly Khanan pass ETL (one record at a time).
 */
export class KhananPassImportSession {
  /**
   * @param {import('@vahanplus/db').PrismaClient} prisma
   * @param {{ replaceExisting?: boolean, refreshVehicleStatus?: boolean, importBatchId?: string }} opts
   */
  constructor(prisma, opts = {}) {
    this.prisma = prisma;
    this.replaceExisting = Boolean(opts.replaceExisting);
    this.refreshVehicleStatus = Boolean(opts.refreshVehicleStatus);
    this.importBatchId = opts.importBatchId ?? makeImportBatchId();
    this.replacedDates = new Set();
    /** @type {Map<string, { snapshot: import('@vahanplus/db').EpassSnapshot, caches: object, scrapeOffset: number }>} */
    this.byDate = new Map();
    this.vrns = new Set();
    this.passesImported = 0;
    this.rowsSkipped = 0;
    this.duplicatePassesSkipped = 0;
    this.snapshotsCreated = 0;
    this.warnings = [];
    this.now = new Date();
    this.globalScrapeOffset = 0;
    /** @type {Map<string, typeof this.byDate>} */
    this.pendingByDate = new Map();
  }

  /**
   * @param {Record<string, string>} m normalized mapped fields
   */
  async ingestRecord(m) {
    if (!m.district || !m.consignerName || !m.challanNo) {
      this.rowsSkipped += 1;
      return;
    }

    const isoDate = parsePortalReportDate(m.date ?? '');
    if (!isoDate) {
      this.rowsSkipped += 1;
      return;
    }

    if (this.replaceExisting && !this.replacedDates.has(isoDate)) {
      await this.prisma.epassSnapshot.deleteMany({
        where: { reportDate: isoDate, sourceUrl: 'import' },
      });
      this.replacedDates.add(isoDate);
      this.byDate.delete(isoDate);
    }

    let ctx = this.byDate.get(isoDate);
    if (!ctx) {
      const snapshot = await this.prisma.epassSnapshot.create({
        data: {
          reportDate: isoDate,
          reportGeneratedOn: this.importBatchId,
          sourceUrl: 'import',
          scrapedAt: new Date(this.now.getTime() + this.globalScrapeOffset++),
        },
      });
      this.snapshotsCreated += 1;
      ctx = {
        snapshot,
        caches: {
          district: new Map(),
          consigner: new Map(),
          challan: new Map(),
          passSlNo: new Map(),
          duplicatePass: new Map(),
          districtSlNo: 0,
          consignerSlNo: new Map(),
          challanSlNo: new Map(),
        },
        pending: [],
      };
      this.byDate.set(isoDate, ctx);
    }

    ctx.pending.push(m);
    if (ctx.pending.length >= CHUNK_SIZE) {
      await this.flushDateContext(isoDate, ctx);
    }
  }

  /**
   * @param {string} isoDate
   * @param {{ snapshot: object, caches: object, pending: Record<string, string>[] }} ctx
   */
  async flushDateContext(isoDate, ctx) {
    const batch = ctx.pending.splice(0, ctx.pending.length);
    for (const m of batch) {
      await this.writePass(ctx.snapshot, ctx.caches, m);
    }
  }

  async flushAll() {
    for (const [isoDate, ctx] of this.byDate) {
      if (ctx.pending.length > 0) {
        await this.flushDateContext(isoDate, ctx);
      }
    }
  }

  /**
   * @param {import('@vahanplus/db').EpassSnapshot} snapshot
   * @param {*} caches
   * @param {Record<string, string>} m
   */
  async writePass(snapshot, caches, m) {
    const districtRow = await getOrCreateDistrict(this.prisma, snapshot.id, m.district, caches);
    const operatorType = mapSourceTypeToOperator(m.sourceType);
    const consignerRow = await getOrCreateConsigner(
      this.prisma,
      snapshot.id,
      districtRow,
      operatorType,
      m.consignerName,
      m.mineralName,
      caches,
    );
    const qty = parseQty(m.quantity);
    const { challanRow, isNew: newChallan } = await getOrCreateChallan(
      this.prisma,
      consignerRow,
      m.consigneeName || '—',
      m.challanNo,
      m.mineralName,
      m.mineralCategory,
      m.unit,
      caches,
    );

    if (newChallan) {
      await this.prisma.epassConsignerRow.update({
        where: { id: consignerRow.id },
        data: { challanCount: { increment: 1 } },
      });
    }

    const vehicleRegNo = normalizeVehicleRegNo(m.vehicleRegNo);
    const dedupeKey = passImportDedupeKey(m, vehicleRegNo, qty);
    let seen = caches.duplicatePass.get(challanRow.id);
    if (!seen) {
      seen = new Set();
      caches.duplicatePass.set(challanRow.id, seen);
    }
    if (seen.has(dedupeKey)) {
      this.rowsSkipped += 1;
      this.duplicatePassesSkipped += 1;
      return;
    }

    const existingPass = await this.prisma.epassChallanPassRow.findFirst({
      where: {
        challanRowId: challanRow.id,
        challanNo: m.challanNo,
        consigneeName: m.consigneeName || '—',
        vehicleRegNo: vehicleRegNo ?? null,
        destination: m.destination || null,
        transportedDate: m.transportedDate || null,
        quantity: qty,
        unit: m.unit || null,
        mineral: m.mineralName || null,
        checkStatus: m.checkStatus || null,
      },
      select: { id: true },
    });
    if (existingPass) {
      seen.add(dedupeKey);
      this.rowsSkipped += 1;
      this.duplicatePassesSkipped += 1;
      return;
    }
    seen.add(dedupeKey);

    const passSlNo = (caches.passSlNo.get(challanRow.id) ?? 0) + 1;
    caches.passSlNo.set(challanRow.id, passSlNo);

    if (vehicleRegNo) this.vrns.add(vehicleRegNo);

    await this.prisma.epassChallanPassRow.create({
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
        scrapedAt: this.now,
      },
    });

    await this.prisma.epassChallanRow.update({
      where: { id: challanRow.id },
      data: {
        challanCount: { increment: 1 },
        dispatchedQty: { increment: qty },
      },
    });

    this.passesImported += 1;
  }

  async finalize() {
    await this.flushAll();
    const fanout = await enqueueVehicleStatusJobs(this.prisma, [...this.vrns], this.importBatchId, {
      refreshAll: this.refreshVehicleStatus,
    });

    return {
      batchId: this.importBatchId,
      snapshotsCreated: this.snapshotsCreated,
      passesImported: this.passesImported,
      rowsSkipped: this.rowsSkipped,
      vrnsQueued: fanout.enqueued ?? 0,
      vrnsSkippedExisting: fanout.skippedExisting ?? 0,
      fanoutSkipped: fanout.skipped ?? false,
      warnings: [
        ...this.warnings,
        ...(this.duplicatePassesSkipped > 0
          ? [`${this.duplicatePassesSkipped} duplicate pass row(s) skipped`]
          : []),
      ],
    };
  }
}

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
  const key = `${consignerRow.id}|${normalizeConsigneeName(consigneeName)}|${challanNo}`;
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

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {Record<string, string>[]} rows
 * @param {Record<string, string>} mapping
 * @param {{ replaceExisting?: boolean, refreshVehicleStatus?: boolean }} input
 */
export async function commitKhananPassRows(prisma, rows, mapping, input) {
  const { pickKhananMapped } = await import('./mapping.js');
  const session = new KhananPassImportSession(prisma, input);

  for (const row of rows) {
    const m = pickKhananMapped(row, mapping);
    await session.ingestRecord(m);
  }

  return session.finalize();
}
