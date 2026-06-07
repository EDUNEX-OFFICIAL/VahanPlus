import {
  AGGREGATOR_VERSION,
  candidateWins,
  challanPassEntityKey,
  consigneeEntityKey,
  consignerEntityKey,
  districtEntityKey,
} from './semantics.js';
import { normalizeConsignerName, normalizeMineralLabel } from './labels.js';
import { rebuildMineralSummary } from './mineralRebuild.js';

const CHUNK = 500;

function toNum(v) {
  return v != null ? Number(v) : 0;
}

async function upsertIfWinner(prisma, table, entityKey, candidate, buildData) {
  const existing = await prisma[table].findUnique({ where: { entityKey } });
  if (!existing) {
    await prisma[table].create({ data: buildData(candidate) });
    return true;
  }
  if (
    candidateWins(
      { reportDate: candidate.reportDate, scrapedAt: candidate.scrapedAt },
      { reportDate: existing.lastReportDate, scrapedAt: existing.lastScrapedAt },
    )
  ) {
    await prisma[table].update({ where: { entityKey }, data: buildData(candidate) });
    return true;
  }
  return false;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} snapshotId
 * @param {{ trigger?: string }} opts
 */
export async function aggregateSnapshot(prisma, snapshotId, opts = {}) {
  const started = Date.now();
  const snapshot = await prisma.epassSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const meta = {
    reportDate: snapshot.reportDate,
    scrapedAt: snapshot.scrapedAt,
    snapshotId: snapshot.id,
  };

  let updated = 0;
  const touchedVrns = new Set();

  const districtRows = await prisma.epassDistrictRow.findMany({ where: { snapshotId } });
  for (const row of districtRows) {
    const entityKey = districtEntityKey(row.dmoName);
    const won = await upsertIfWinner(prisma, 'reportDistrictSummary', entityKey, meta, () => ({
      entityKey,
      dmoName: row.dmoName,
      dmoId: row.dmoId,
      slNo: row.slNo,
      lesseeMineral: row.lesseeMineral,
      lesseeUsers: row.lesseeUsers,
      lesseePasses: row.lesseePasses,
      lesseeDispatchedQty: row.lesseeDispatchedQty,
      dealerMineral: row.dealerMineral,
      dealerUsers: row.dealerUsers,
      dealerPasses: row.dealerPasses,
      dealerDispatchedQty: row.dealerDispatchedQty,
      totalUsers: row.totalUsers,
      totalPasses: row.totalPasses,
      lesseeMineralId: row.lesseeMineralId,
      dealerMineralId: row.dealerMineralId,
      lesseePassDetailUrl: row.lesseePassDetailUrl,
      dealerPassDetailUrl: row.dealerPassDetailUrl,
      lastSnapshotId: snapshot.id,
      lastReportDate: snapshot.reportDate,
      lastScrapedAt: snapshot.scrapedAt,
      sourceRowId: row.id,
    }));
    if (won) updated += 1;

    await prisma.reportDistrictContribution.upsert({
      where: { snapshotId_entityKey: { snapshotId, entityKey } },
      create: {
        snapshotId,
        entityKey,
        reportDate: snapshot.reportDate,
        scrapedAt: snapshot.scrapedAt,
        metrics: { districtRowId: row.id },
      },
      update: {
        reportDate: snapshot.reportDate,
        scrapedAt: snapshot.scrapedAt,
        metrics: { districtRowId: row.id },
      },
    });
  }

  const consignerRows = await prisma.epassConsignerRow.findMany({
    where: { snapshotId },
    include: { districtRow: true, _count: { select: { challans: true } } },
  });

  for (const row of consignerRows) {
    const entityKey = consignerEntityKey(row);
    const won = await upsertIfWinner(prisma, 'reportConsignerSummary', entityKey, meta, () => ({
      entityKey,
      dmoName: row.districtRow.dmoName,
      operatorType: row.operatorType,
      consignerName: normalizeConsignerName(row.consignerName),
      mineral: normalizeMineralLabel(row.mineral),
      mineralType: row.mineralType,
      slNo: row.slNo,
      challanCount: row.challanCount,
      challanLineCount: row._count?.challans ?? 0,
      ghatNumber: row.ghatNumber,
      challanDetailUrl: row.challanDetailUrl,
      districtRowId: row.districtRowId,
      districtSlNo: row.districtRow.slNo,
      lastSnapshotId: snapshot.id,
      lastReportDate: snapshot.reportDate,
      lastScrapedAt: snapshot.scrapedAt,
      sourceRowId: row.id,
    }));
    if (won) updated += 1;
  }

  const challanRows = await prisma.epassChallanRow.findMany({
    where: { consignerRow: { snapshotId } },
    include: {
      consignerRow: { include: { districtRow: true } },
    },
  });

  for (const row of challanRows) {
    const entityKey = consigneeEntityKey(row);
    const won = await upsertIfWinner(prisma, 'reportConsigneeSummary', entityKey, meta, () => ({
      entityKey,
      consigneeName: row.consigneeName,
      mineral: normalizeMineralLabel(row.mineral),
      mineralCategory: row.mineralCategory,
      slNo: row.slNo,
      challanCount: row.challanCount,
      dispatchedQty: row.dispatchedQty,
      unit: row.unit,
      ghatNumber: row.ghatNumber,
      dmoName: row.consignerRow.districtRow.dmoName,
      operatorType: row.consignerRow.operatorType,
      consignerName: normalizeConsignerName(row.consignerRow.consignerName),
      consignerRowId: row.consignerRowId,
      lastSnapshotId: snapshot.id,
      lastReportDate: snapshot.reportDate,
      lastScrapedAt: snapshot.scrapedAt,
      sourceRowId: row.id,
    }));
    if (won) updated += 1;
  }

  let passOffset = 0;
  for (;;) {
    const passRows = await prisma.epassChallanPassRow.findMany({
      where: { challanRow: { consignerRow: { snapshotId } } },
      include: {
        challanRow: {
          include: {
            consignerRow: { include: { districtRow: { include: { snapshot: true } } } },
          },
        },
      },
      take: CHUNK,
      skip: passOffset,
      orderBy: { id: 'asc' },
    });
    if (passRows.length === 0) break;
    passOffset += passRows.length;

    for (const row of passRows) {
      const reportDate =
        row.challanRow?.consignerRow?.districtRow?.snapshot?.reportDate ?? snapshot.reportDate;
      const entityKey = challanPassEntityKey(row, reportDate);
      const won = await upsertIfWinner(prisma, 'reportChallanPassSummary', entityKey, meta, () => ({
        entityKey,
        challanRowId: row.challanRowId,
        slNo: row.slNo,
        consigneeName: row.consigneeName,
        challanNo: row.challanNo,
        portalPassId: row.portalPassId,
        mineral: normalizeMineralLabel(row.mineral),
        mineralCategory: row.mineralCategory,
        vehicleRegNo: row.vehicleRegNo,
        destination: row.destination,
        transportedDate: row.transportedDate,
        quantity: row.quantity,
        unit: row.unit,
        checkStatus: row.checkStatus,
        portalChallanUrl: row.portalChallanUrl,
        dmoName: row.challanRow.consignerRow.districtRow.dmoName,
        operatorType: row.challanRow.consignerRow.operatorType,
        consignerName: normalizeConsignerName(row.challanRow.consignerRow.consignerName),
        consignerRowId: row.challanRow.consignerRowId,
        lastSnapshotId: snapshot.id,
        lastReportDate: reportDate,
        lastScrapedAt: row.scrapedAt,
        sourceRowId: row.id,
      }));
      if (won) updated += 1;

      if (row.vehicleRegNo?.trim()) {
        touchedVrns.add(row.vehicleRegNo.trim().toUpperCase());
      }

      await prisma.reportPassContribution.upsert({
        where: { snapshotId_entityKey: { snapshotId, entityKey } },
        create: {
          snapshotId,
          entityKey,
          reportDate,
          scrapedAt: row.scrapedAt,
          vehicleRegNo: row.vehicleRegNo,
          quantity: row.quantity,
        },
        update: {
          reportDate,
          scrapedAt: row.scrapedAt,
          vehicleRegNo: row.vehicleRegNo,
          quantity: row.quantity,
        },
      });
    }
  }

  for (const vrn of touchedVrns) {
    await rebuildVehiclePassSummaryForVrn(prisma, vrn);
  }

  const mineralCount = await rebuildMineralSummary(prisma);

  await prisma.reportAggregateCheckpoint.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      aggregatorVersion: AGGREGATOR_VERSION,
      lastSnapshotId: snapshotId,
    },
    update: {
      aggregatorVersion: AGGREGATOR_VERSION,
      lastSnapshotId: snapshotId,
    },
  });

  const durationMs = Date.now() - started;
  return {
    snapshotId,
    trigger: opts.trigger ?? 'unknown',
    entitiesUpdated: updated,
    mineralRows: mineralCount,
    vehicleVrns: touchedVrns.size,
    durationMs,
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {string} vehicleRegNo
 */
export async function rebuildVehiclePassSummaryForVrn(prisma, vehicleRegNo) {
  const vrn = vehicleRegNo.trim().toUpperCase();
  if (!vrn) return;

  const contributions = await prisma.reportPassContribution.findMany({
    where: { vehicleRegNo: vrn },
    orderBy: [{ reportDate: 'asc' }, { scrapedAt: 'asc' }],
  });

  const byPassKey = new Map();
  for (const c of contributions) {
    const prev = byPassKey.get(c.entityKey);
    if (!prev || candidateWins(c, prev)) {
      byPassKey.set(c.entityKey, c);
    }
  }

  const summaries = await prisma.reportChallanPassSummary.findMany({
    where: { entityKey: { in: [...byPassKey.keys()] } },
  });
  const summaryByKey = new Map(summaries.map((s) => [s.entityKey, s]));

  let passCount = 0;
  let totalQuantity = 0;
  const quantityByUnit = {};
  const minerals = new Set();
  const dmoNames = new Set();
  const consignerNames = new Set();
  const destinations = new Set();
  let lastTransportedDate = null;
  let lastScrapedAt = null;

  for (const [key] of byPassKey) {
    const s = summaryByKey.get(key);
    if (!s) continue;
    passCount += 1;
    const qty = toNum(s.quantity);
    totalQuantity += qty;
    const unitKey = (s.unit && String(s.unit).trim()) || '—';
    quantityByUnit[unitKey] = (quantityByUnit[unitKey] ?? 0) + qty;
    if (s.mineral) minerals.add(s.mineral);
    if (s.dmoName) dmoNames.add(s.dmoName);
    if (s.consignerName) consignerNames.add(s.consignerName);
    if (s.destination) destinations.add(s.destination);
    const td = s.transportedDate?.trim() || null;
    if (td && (!lastTransportedDate || td.localeCompare(lastTransportedDate) > 0)) {
      lastTransportedDate = td;
    }
    const scraped = s.lastScrapedAt;
    if (!lastScrapedAt || scraped > lastScrapedAt) lastScrapedAt = scraped;
  }

  await prisma.reportVehiclePassSummary.upsert({
    where: { entityKey: vrn },
    create: {
      entityKey: vrn,
      vehicleRegNo: vrn,
      passCount,
      totalQuantity,
      quantityByUnit,
      minerals: [...minerals],
      dmoNames: [...dmoNames],
      consignerNames: [...consignerNames],
      destinations: [...destinations],
      lastTransportedDate,
      lastScrapedAt: lastScrapedAt ?? new Date(),
    },
    update: {
      passCount,
      totalQuantity,
      quantityByUnit,
      minerals: [...minerals],
      dmoNames: [...dmoNames],
      consignerNames: [...consignerNames],
      destinations: [...destinations],
      lastTransportedDate,
      lastScrapedAt: lastScrapedAt ?? new Date(),
    },
  });
}
