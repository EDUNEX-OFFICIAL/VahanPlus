import { daysLeftFromDate } from '../utils/epassDates.js';

function toNumber(value) {
  if (value == null) return 0;
  return Number(value);
}

export function parseExpiryDaysParams(query) {
  const insuranceExpiryDays = Number(query.insuranceExpiryDays);
  const rcExpiryDays = Number(query.rcExpiryDays);
  const fitnessExpiryDays = Number(query.fitnessExpiryDays);
  return {
    insuranceDays: Number.isFinite(insuranceExpiryDays) ? insuranceExpiryDays : null,
    rcDays: Number.isFinite(rcExpiryDays) ? rcExpiryDays : null,
    fitnessDays: Number.isFinite(fitnessExpiryDays) ? fitnessExpiryDays : null,
  };
}

export function hasExpiryDayFilters(query) {
  const { insuranceDays, rcDays, fitnessDays } = parseExpiryDaysParams(query);
  return insuranceDays != null || rcDays != null || fitnessDays != null;
}

export function buildVehicleStatusWhere(query) {
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
  const vehicleClass = typeof query.vehicleClass === 'string' ? query.vehicleClass.trim() : '';
  if (vehicleClass) {
    where.vehicleClass = { contains: vehicleClass, mode: 'insensitive' };
  }
  const esimValidity = typeof query.esimValidity === 'string' ? query.esimValidity.trim() : '';
  if (esimValidity) {
    where.esimValidity = { contains: esimValidity, mode: 'insensitive' };
  }
  const grossWeightMin = Number(query.grossWeightMin);
  const grossWeightMax = Number(query.grossWeightMax);
  if (Number.isFinite(grossWeightMin) || Number.isFinite(grossWeightMax)) {
    where.grossWeightMt = {
      ...(Number.isFinite(grossWeightMin) ? { gte: grossWeightMin } : {}),
      ...(Number.isFinite(grossWeightMax) ? { lte: grossWeightMax } : {}),
    };
  }
  return where;
}

export function buildVehicleStatusOrderBy(query) {
  const dir = query.dir === 'desc' ? 'desc' : 'asc';
  const sort = typeof query.sort === 'string' ? query.sort : 'vehicleRegNo';
  const map = {
    vehicleRegNo: { vehicleRegNo: dir },
    ksRegNo: { ksRegNo: dir },
    vehicleClass: { vehicleClass: dir },
    rcFitUpTo: { rcFitUpTo: dir },
    rcTaxUpTo: { rcTaxUpTo: dir },
    insuranceUpTo: { insuranceUpTo: dir },
    insuranceDaysLeft: { insuranceUpTo: dir },
    rcDaysLeft: { rcTaxUpTo: dir },
    fitnessDaysLeft: { rcFitUpTo: dir },
    puccUpTo: { puccUpTo: dir },
    imeiNo: { imeiNo: dir },
    esimValidity: { esimValidity: dir },
    grossWeightMt: { grossWeightMt: dir },
    unladenWeightMt: { unladenWeightMt: dir },
    scrapedAt: { scrapedAt: dir },
    crmSource: { vehicleRegNo: dir },
  };
  return map[sort] ?? { vehicleRegNo: dir };
}

export function mapVehicleStatusListItem(row, extra = {}) {
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
    insuranceDaysLeft: daysLeftFromDate(row.insuranceUpTo),
    rcDaysLeft: daysLeftFromDate(row.rcTaxUpTo),
    fitnessDaysLeft: daysLeftFromDate(row.rcFitUpTo),
    scrapedAt: row.scrapedAt.toISOString(),
    ...extra,
  };
}

export function matchesAnyExpiryThreshold(item, insuranceDays, rcDays, fitnessDays) {
  const legs = [];
  if (Number.isFinite(insuranceDays)) {
    legs.push(item.insuranceDaysLeft != null && item.insuranceDaysLeft <= insuranceDays);
  }
  if (Number.isFinite(rcDays)) {
    legs.push(item.rcDaysLeft != null && item.rcDaysLeft <= rcDays);
  }
  if (Number.isFinite(fitnessDays)) {
    legs.push(item.fitnessDaysLeft != null && item.fitnessDaysLeft <= fitnessDays);
  }
  if (legs.length === 0) return false;
  return legs.some(Boolean);
}

export function sortVehicleStatusItems(items, query) {
  const dir = query.dir === 'desc' ? -1 : 1;
  const sort = typeof query.sort === 'string' ? query.sort : 'vehicleRegNo';
  const computedKeys = new Set(['insuranceDaysLeft', 'rcDaysLeft', 'fitnessDaysLeft', 'crmSource']);

  return [...items].sort((a, b) => {
    let av;
    let bv;
    if (computedKeys.has(sort)) {
      av = a[sort];
      bv = b[sort];
    } else if (sort === 'scrapedAt') {
      av = a.scrapedAt;
      bv = b.scrapedAt;
    } else {
      av = a[sort];
      bv = b[sort];
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'en', { numeric: true }) * dir;
  });
}
