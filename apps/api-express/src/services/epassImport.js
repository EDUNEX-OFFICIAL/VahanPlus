const DISTRICT_REQUIRED = ['dmoName'];
const DISTRICT_ALIASES = {
  dmoName: ['dmoname', 'district', 'dmo name', 'dmo'],
  lesseeMineral: ['lesseemineral', 'lessee mineral'],
  lesseeUsers: ['lesseeusers', 'lessee users'],
  lesseePasses: ['lesseepasses', 'lessee passes'],
  lesseeDispatchedQty: ['lesseedispatchedqty', 'lessee qty', 'lessee quantity'],
  dealerMineral: ['dealermineral', 'dealer mineral'],
  dealerUsers: ['dealerusers', 'dealer users'],
  dealerPasses: ['dealerpasses', 'dealer passes'],
  dealerDispatchedQty: ['dealerdispatchedqty', 'dealer qty', 'dealer quantity'],
};

const VEHICLE_REQUIRED = ['vehicleRegNo'];
const VEHICLE_ALIASES = {
  vehicleRegNo: ['vehicleregno', 'vrn', 'vehicle reg no', 'registration'],
  ksRegNo: ['ksregno', 'ks reg no'],
  vehicleClass: ['vehicleclass', 'class'],
  rcFitUpTo: ['rcfitupto', 'fitness'],
  rcTaxUpTo: ['rctaxupto', 'tax'],
  insuranceUpTo: ['insuranceupto', 'insurance'],
  puccUpTo: ['puccupto', 'pucc'],
  imeiNo: ['imeino', 'imei'],
  esimValidity: ['esimvalidity', 'esim'],
  grossWeightMt: ['grossweightmt', 'gross weight'],
  unladenWeightMt: ['unladenweightmt', 'unladen weight'],
  found: ['found', 'portal found'],
};

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
function buildMapping(headers, aliases, required) {
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
 * @param {string[]} headers
 * @param {Record<string, string>[]} sampleRows
 */
export function analyzeImportPayload(headers, sampleRows) {
  if (!headers?.length) {
    return {
      detectedType: null,
      mapping: {},
      errors: ['No headers found'],
      warnings: [],
      rowCount: sampleRows?.length ?? 0,
    };
  }

  const district = buildMapping(headers, DISTRICT_ALIASES, DISTRICT_REQUIRED);
  const vehicle = buildMapping(headers, VEHICLE_ALIASES, VEHICLE_REQUIRED);

  const districtScore = Object.keys(district.mapping).length;
  const vehicleScore = Object.keys(vehicle.mapping).length;

  if (districtScore >= 3 && districtScore >= vehicleScore) {
    return {
      detectedType: 'district_snapshot',
      mapping: district.mapping,
      errors: district.errors,
      warnings: [],
      rowCount: sampleRows?.length ?? 0,
    };
  }

  if (vehicle.mapping.vehicleRegNo) {
    return {
      detectedType: 'vehicle_status',
      mapping: vehicle.mapping,
      errors: vehicle.errors,
      warnings: [],
      rowCount: sampleRows?.length ?? 0,
    };
  }

  return {
    detectedType: null,
    mapping: {},
    errors: ['Unrecognized CSV format'],
    warnings: [],
    rowCount: sampleRows?.length ?? 0,
  };
}

/**
 * @param {Record<string, string>} row
 * @param {Record<string, string>} mapping
 */
function pickMapped(row, mapping) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (header && row[header] != null) out[field] = String(row[header]).trim();
  }
  return out;
}

function parseNum(value) {
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {{ rows: Record<string, string>[], mapping: Record<string, string>, reportDate?: string }} input
 */
export async function commitDistrictImport(prisma, input) {
  const { rows, mapping } = input;
  const reportDate = input.reportDate?.trim() || new Date().toISOString().slice(0, 10);

  const snapshot = await prisma.epassSnapshot.create({
    data: {
      reportDate,
      reportGeneratedOn: 'Imported',
      sourceUrl: 'import',
      scrapedAt: new Date(),
    },
  });

  let slNo = 0;
  for (const row of rows) {
    const m = pickMapped(row, mapping);
    if (!m.dmoName) continue;
    slNo += 1;
    await prisma.epassDistrictRow.create({
      data: {
        snapshotId: snapshot.id,
        slNo,
        dmoName: m.dmoName,
        lesseeMineral: m.lesseeMineral || null,
        lesseeUsers: parseNum(m.lesseeUsers),
        lesseePasses: parseNum(m.lesseePasses),
        lesseeDispatchedQty: parseNum(m.lesseeDispatchedQty),
        dealerMineral: m.dealerMineral || null,
        dealerUsers: parseNum(m.dealerUsers),
        dealerPasses: parseNum(m.dealerPasses),
        dealerDispatchedQty: parseNum(m.dealerDispatchedQty),
        totalUsers: parseNum(m.lesseeUsers) + parseNum(m.dealerUsers),
        totalPasses: parseNum(m.lesseePasses) + parseNum(m.dealerPasses),
      },
    });
  }

  return { snapshotId: snapshot.id, rowsImported: slNo, reportDate };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {{ rows: Record<string, string>[], mapping: Record<string, string> }} input
 */
export async function commitVehicleStatusImport(prisma, input) {
  const { rows, mapping } = input;
  let upserted = 0;
  const now = new Date();

  for (const row of rows) {
    const m = pickMapped(row, mapping);
    const vehicleRegNo = m.vehicleRegNo?.toUpperCase();
    if (!vehicleRegNo) continue;

    const foundRaw = (m.found ?? 'true').toLowerCase();
    const found = !['false', '0', 'no', 'n'].includes(foundRaw);

    await prisma.epassVehicleStatusRow.upsert({
      where: { vehicleRegNo },
      create: {
        vehicleRegNo,
        ksRegNo: m.ksRegNo || null,
        vehicleClass: m.vehicleClass || null,
        rcFitUpTo: m.rcFitUpTo || null,
        rcTaxUpTo: m.rcTaxUpTo || null,
        insuranceUpTo: m.insuranceUpTo || null,
        puccUpTo: m.puccUpTo || null,
        imeiNo: m.imeiNo || null,
        esimValidity: m.esimValidity || null,
        grossWeightMt: m.grossWeightMt ? parseNum(m.grossWeightMt) : null,
        unladenWeightMt: m.unladenWeightMt ? parseNum(m.unladenWeightMt) : null,
        found,
        scrapedAt: now,
      },
      update: {
        ksRegNo: m.ksRegNo || null,
        vehicleClass: m.vehicleClass || null,
        rcFitUpTo: m.rcFitUpTo || null,
        rcTaxUpTo: m.rcTaxUpTo || null,
        insuranceUpTo: m.insuranceUpTo || null,
        puccUpTo: m.puccUpTo || null,
        imeiNo: m.imeiNo || null,
        esimValidity: m.esimValidity || null,
        grossWeightMt: m.grossWeightMt ? parseNum(m.grossWeightMt) : null,
        unladenWeightMt: m.unladenWeightMt ? parseNum(m.unladenWeightMt) : null,
        found,
        scrapedAt: now,
      },
    });
    upserted += 1;
  }

  return { upserted };
}
