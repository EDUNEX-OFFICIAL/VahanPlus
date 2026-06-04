import { normalizeVehicleRegNo } from '@vahanplus/scraper-bihar-epass';
import {
  buildVehicleStatusWhere,
  mapVehicleStatusListItem,
  matchesAnyExpiryThreshold,
  sortVehicleStatusItems,
} from './vehicleStatusList.js';

function parseThreshold(query, key, defaultValue) {
  const n = Number(query[key]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.max(0, Math.floor(n));
}

function manualOrphanPassesBrowse(query, vehicleRegNo) {
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';
  if (q && !vehicleRegNo.toLowerCase().includes(q)) return false;
  if (query.found === '1' || query.found === 'true') return false;
  if (query.found === '0' || query.found === 'false') return true;
  const vehicleClass = typeof query.vehicleClass === 'string' ? query.vehicleClass.trim() : '';
  if (vehicleClass) return false;
  const esimValidity = typeof query.esimValidity === 'string' ? query.esimValidity.trim() : '';
  if (esimValidity) return false;
  const grossWeightMin = Number(query.grossWeightMin);
  const grossWeightMax = Number(query.grossWeightMax);
  if (Number.isFinite(grossWeightMin) || Number.isFinite(grossWeightMax)) return false;
  return true;
}

function resolveCrmSource(manualActive, autoQualifies) {
  if (manualActive && autoQualifies) return 'both';
  if (manualActive) return 'manual';
  return 'auto';
}

function emptyStatusItem(entry) {
  return {
    id: entry.id,
    vehicleRegNo: entry.vehicleRegNo,
    ksRegNo: null,
    vehicleClass: null,
    rcFitUpTo: null,
    rcTaxUpTo: null,
    insuranceUpTo: null,
    puccUpTo: null,
    imeiNo: null,
    esimValidity: null,
    grossWeightMt: null,
    unladenWeightMt: null,
    found: false,
    insuranceDaysLeft: null,
    rcDaysLeft: null,
    fitnessDaysLeft: null,
    scrapedAt: entry.updatedAt.toISOString(),
  };
}

export async function buildActiveCrmQueue(prisma, query) {
  const insuranceDays = parseThreshold(query, 'insuranceExpiryDays', 30);
  const rcDays = parseThreshold(query, 'rcExpiryDays', 30);
  const fitnessDays = parseThreshold(query, 'fitnessExpiryDays', 30);

  const where = buildVehicleStatusWhere(query);
  const [statusRows, crmEntries, latestRow] = await Promise.all([
    prisma.epassVehicleStatusRow.findMany({ where }),
    prisma.crmVehicleExpiryEntry.findMany(),
    prisma.epassVehicleStatusRow.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { scrapedAt: true },
    }),
  ]);

  const crmByVrn = new Map(crmEntries.map((e) => [e.vehicleRegNo, e]));
  const queue = [];
  const seen = new Set();

  for (const row of statusRows) {
    const item = mapVehicleStatusListItem(row);
    const crm = crmByVrn.get(row.vehicleRegNo);
    const suppressed = crm?.status === 'removed';
    const manualActive = crm?.status === 'active' && crm?.source === 'manual';
    const autoQualifies = matchesAnyExpiryThreshold(item, insuranceDays, rcDays, fitnessDays);

    if (!manualActive && (!autoQualifies || suppressed)) continue;

    const crmSource = resolveCrmSource(manualActive, autoQualifies);
    queue.push({
      ...item,
      crmSource,
      crmStatus: 'active',
      crmEntryId: crm?.id ?? null,
      notes: crm?.notes ?? null,
    });
    seen.add(row.vehicleRegNo);
  }

  const manualPending = crmEntries.filter(
    (e) => e.status === 'active' && e.source === 'manual' && !seen.has(e.vehicleRegNo),
  );
  if (manualPending.length > 0) {
    const manualVrns = manualPending.map((e) => e.vehicleRegNo);
    const [manualFilteredRows, allManualRows] = await Promise.all([
      prisma.epassVehicleStatusRow.findMany({
        where: { AND: [where, { vehicleRegNo: { in: manualVrns } }] },
      }),
      prisma.epassVehicleStatusRow.findMany({
        where: { vehicleRegNo: { in: manualVrns } },
      }),
    ]);
    const manualFilteredByVrn = new Map(manualFilteredRows.map((r) => [r.vehicleRegNo, r]));
    const allManualByVrn = new Map(allManualRows.map((r) => [r.vehicleRegNo, r]));

    for (const entry of manualPending) {
      const filteredRow = manualFilteredByVrn.get(entry.vehicleRegNo);
      if (filteredRow) {
        queue.push({
          ...mapVehicleStatusListItem(filteredRow),
          crmSource: 'manual',
          crmStatus: 'active',
          crmEntryId: entry.id,
          notes: entry.notes ?? null,
        });
        seen.add(entry.vehicleRegNo);
        continue;
      }
      if (allManualByVrn.has(entry.vehicleRegNo)) continue;
      if (!manualOrphanPassesBrowse(query, entry.vehicleRegNo)) continue;
      queue.push({
        ...emptyStatusItem(entry),
        crmSource: 'manual',
        crmStatus: 'active',
        crmEntryId: entry.id,
        notes: entry.notes ?? null,
      });
      seen.add(entry.vehicleRegNo);
    }
  }

  return { queue, lastScrapedAt: latestRow?.scrapedAt?.toISOString() ?? null };
}

export async function buildRemovedCrmQueue(prisma, query) {
  const where = buildVehicleStatusWhere(query);
  const [removedEntries, latestRow] = await Promise.all([
    prisma.crmVehicleExpiryEntry.findMany({ where: { status: 'removed' } }),
    prisma.epassVehicleStatusRow.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { scrapedAt: true },
    }),
  ]);

  const queue = [];
  const removedVrns = removedEntries.map((e) => e.vehicleRegNo);
  let allRemovedRows = [];
  let filteredRemovedRows = [];
  if (removedVrns.length > 0) {
    [filteredRemovedRows, allRemovedRows] = await Promise.all([
      prisma.epassVehicleStatusRow.findMany({
        where: { AND: [where, { vehicleRegNo: { in: removedVrns } }] },
      }),
      prisma.epassVehicleStatusRow.findMany({
        where: { vehicleRegNo: { in: removedVrns } },
      }),
    ]);
  }
  const filteredRemovedByVrn = new Map(filteredRemovedRows.map((r) => [r.vehicleRegNo, r]));
  const allRemovedByVrn = new Map(allRemovedRows.map((r) => [r.vehicleRegNo, r]));

  for (const entry of removedEntries) {
    const row = filteredRemovedByVrn.get(entry.vehicleRegNo);
    if (!row) {
      if (allRemovedByVrn.has(entry.vehicleRegNo)) continue;
      if (!manualOrphanPassesBrowse(query, entry.vehicleRegNo)) continue;
    }
    const base = row ? mapVehicleStatusListItem(row) : emptyStatusItem(entry);
    queue.push({
      ...base,
      crmSource: entry.source === 'manual' ? 'manual' : 'auto',
      crmStatus: 'removed',
      crmEntryId: entry.id,
      notes: entry.notes ?? null,
    });
  }

  return { queue, lastScrapedAt: latestRow?.scrapedAt?.toISOString() ?? null };
}

export function applyCrmQueueFilters(queue, query) {
  const source = typeof query.source === 'string' ? query.source : 'all';
  let filtered = queue;
  if (source === 'auto') {
    filtered = filtered.filter((r) => r.crmSource === 'auto' || r.crmSource === 'both');
  } else if (source === 'manual') {
    filtered = filtered.filter((r) => r.crmSource === 'manual' || r.crmSource === 'both');
  }
  return filtered;
}

export function computeCrmStats(queue) {
  let autoCount = 0;
  let manualCount = 0;
  for (const row of queue) {
    if (row.crmSource === 'auto') autoCount += 1;
    else if (row.crmSource === 'manual') manualCount += 1;
    else if (row.crmSource === 'both') {
      autoCount += 1;
      manualCount += 1;
    }
  }
  return {
    totalInQueue: queue.length,
    autoCount,
    manualCount,
  };
}

export function paginateCrmQueue(queue, query) {
  const sorted = sortVehicleStatusItems(queue, query);
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 1000);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const total = sorted.length;
  const items = sorted.slice(offset, offset + limit);
  return { items, total, limit, offset };
}

export function normalizeVrnParam(raw) {
  return normalizeVehicleRegNo(raw);
}
