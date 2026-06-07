import {
  buildVehicleStatusOrderBy,
  buildVehicleStatusWhere,
  hasExpiryDayFilters,
  parseExpiryDaysParams,
} from './vehicleStatusList.js';

const TABLE = 'processed."EpassVehicleStatusRow"';

const SORT_SQL = {
  vehicleRegNo: '"vehicleRegNo"',
  ksRegNo: '"ksRegNo"',
  vehicleClass: '"vehicleClass"',
  rcFitUpTo: '"rcFitUpTo"',
  rcTaxUpTo: '"rcTaxUpTo"',
  insuranceUpTo: '"insuranceUpTo"',
  insuranceDaysLeft: '"insuranceUpTo"',
  rcDaysLeft: '"rcTaxUpTo"',
  fitnessDaysLeft: '"rcFitUpTo"',
  puccUpTo: '"puccUpTo"',
  imeiNo: '"imeiNo"',
  esimValidity: '"esimValidity"',
  grossWeightMt: '"grossWeightMt"',
  unladenWeightMt: '"unladenWeightMt"',
  scrapedAt: '"scrapedAt"',
  crmSource: '"vehicleRegNo"',
};

function parsedDateExpr(columnSql) {
  return `COALESCE(
    CASE WHEN ${columnSql} ~ '^\\d{1,2}-[A-Za-z]{3}-\\d{4}$' THEN to_date(${columnSql}, 'DD-Mon-YYYY') END,
    CASE WHEN ${columnSql} ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date(${columnSql}, 'DD/MM/YYYY') END,
    CASE WHEN ${columnSql} ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(${columnSql}, 'YYYY-MM-DD') END,
    CASE WHEN ${columnSql} ~ '^\\d{1,2}-\\d{1,2}-\\d{4}$' THEN to_date(${columnSql}, 'DD-MM-YYYY') END
  )`;
}

function expiryWithinExpr(columnSql, days) {
  const parsed = parsedDateExpr(columnSql);
  return `(${parsed}) IS NOT NULL AND (${parsed}) <= CURRENT_DATE + (${Number(days)} * INTERVAL '1 day')`;
}

function expiryOrClause(insuranceDays, rcDays, fitnessDays) {
  const legs = [];
  if (Number.isFinite(insuranceDays)) legs.push(expiryWithinExpr('"insuranceUpTo"', insuranceDays));
  if (Number.isFinite(rcDays)) legs.push(expiryWithinExpr('"rcTaxUpTo"', rcDays));
  if (Number.isFinite(fitnessDays)) legs.push(expiryWithinExpr('"rcFitUpTo"', fitnessDays));
  if (legs.length === 0) return '';
  return `(${legs.join(' OR ')})`;
}

/** SQL WHERE fragments + bound params for browse + optional expiry filters. */
function buildBrowseSql(query, { expiry = null, excludeVrns = [] } = {}) {
  const conditions = ['1=1'];
  const params = [];
  let paramIdx = 1;

  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q) {
    conditions.push(`("vehicleRegNo" ILIKE $${paramIdx} OR "ksRegNo" ILIKE $${paramIdx})`);
    params.push(`%${q}%`);
    paramIdx += 1;
  }
  if (query.found === '0' || query.found === 'false') {
    conditions.push(`"found" = false`);
  } else if (query.found === '1' || query.found === 'true') {
    conditions.push(`"found" = true`);
  }
  const vehicleClass = typeof query.vehicleClass === 'string' ? query.vehicleClass.trim() : '';
  if (vehicleClass) {
    conditions.push(`"vehicleClass" ILIKE $${paramIdx}`);
    params.push(`%${vehicleClass}%`);
    paramIdx += 1;
  }
  const esimValidity = typeof query.esimValidity === 'string' ? query.esimValidity.trim() : '';
  if (esimValidity) {
    conditions.push(`"esimValidity" ILIKE $${paramIdx}`);
    params.push(`%${esimValidity}%`);
    paramIdx += 1;
  }
  const grossWeightMin = Number(query.grossWeightMin);
  const grossWeightMax = Number(query.grossWeightMax);
  if (Number.isFinite(grossWeightMin)) {
    conditions.push(`"grossWeightMt" >= $${paramIdx}`);
    params.push(grossWeightMin);
    paramIdx += 1;
  }
  if (Number.isFinite(grossWeightMax)) {
    conditions.push(`"grossWeightMt" <= $${paramIdx}`);
    params.push(grossWeightMax);
    paramIdx += 1;
  }

  const expiryClause = expiry
    ? expiryOrClause(expiry.insuranceDays, expiry.rcDays, expiry.fitnessDays)
    : expiryOrClause(
        Number(query.insuranceExpiryDays),
        Number(query.rcExpiryDays),
        Number(query.fitnessExpiryDays),
      );
  if (expiryClause) conditions.push(expiryClause);

  if (excludeVrns.length > 0) {
    conditions.push(`NOT ("vehicleRegNo" = ANY($${paramIdx}::text[]))`);
    params.push(excludeVrns);
    paramIdx += 1;
  }

  return { whereSql: conditions.join(' AND '), params, nextParamIdx: paramIdx };
}

function orderSql(query) {
  const dir = query.dir === 'desc' ? 'DESC' : 'ASC';
  const sort = typeof query.sort === 'string' ? query.sort : 'vehicleRegNo';
  const col = SORT_SQL[sort] ?? SORT_SQL.vehicleRegNo;
  return `${col} ${dir} NULLS LAST, "vehicleRegNo" ASC`;
}

function mapRawRow(row) {
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
    grossWeightMt: row.grossWeightMt,
    unladenWeightMt: row.unladenWeightMt,
    found: row.found,
    scrapedAt: row.scrapedAt instanceof Date ? row.scrapedAt : new Date(row.scrapedAt),
    jobId: row.jobId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function queryVehicleStatusSql(prisma, query, { limit, offset, expiry, excludeVrns }) {
  const { whereSql, params, nextParamIdx } = buildBrowseSql(query, { expiry, excludeVrns });
  const limitIdx = nextParamIdx;
  const offsetIdx = nextParamIdx + 1;
  const sqlParams = [...params, limit, offset];

  const [rows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT * FROM ${TABLE} WHERE ${whereSql} ORDER BY ${orderSql(query)} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      ...sqlParams,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM ${TABLE} WHERE ${whereSql}`,
      ...params,
    ),
  ]);

  const total = countRows[0]?.count ?? 0;
  return { rows: rows.map(mapRawRow), total };
}

/**
 * Paginated vehicle status list — DB-level take/skip (no full-table load).
 */
export async function fetchVehicleStatusPage(prisma, query, { limit, offset }) {
  if (hasExpiryDayFilters(query)) {
    return queryVehicleStatusSql(prisma, query, { limit, offset });
  }

  const where = buildVehicleStatusWhere(query);
  const orderBy = buildVehicleStatusOrderBy(query);
  const [rows, total] = await Promise.all([
    prisma.epassVehicleStatusRow.findMany({ where, orderBy, take: limit, skip: offset }),
    prisma.epassVehicleStatusRow.count({ where }),
  ]);
  return { rows, total };
}

/** Global stats (unfiltered) — cheap aggregate queries. */
export async function fetchVehicleStatusGlobalStats(prisma) {
  const [statsTotal, statsFound, statsNotFound, latestRow] = await Promise.all([
    prisma.epassVehicleStatusRow.count(),
    prisma.epassVehicleStatusRow.count({ where: { found: true } }),
    prisma.epassVehicleStatusRow.count({ where: { found: false } }),
    prisma.epassVehicleStatusRow.findFirst({
      orderBy: { scrapedAt: 'desc' },
      select: { scrapedAt: true },
    }),
  ]);
  return {
    total: statsTotal,
    found: statsFound,
    notFound: statsNotFound,
    lastScrapedAt: latestRow?.scrapedAt?.toISOString() ?? null,
  };
}

/** CRM manual-active + suppressed VRN sets (small table). */
export async function loadCrmLookupSets(prisma) {
  const crmRows = await prisma.crmVehicleExpiryEntry.findMany({
    where: { OR: [{ status: 'active', source: 'manual' }, { status: 'removed' }] },
    select: { vehicleRegNo: true, status: true, source: true },
  });
  const manualActive = new Set();
  const suppressed = new Set();
  for (const entry of crmRows) {
    if (entry.status === 'removed') suppressed.add(entry.vehicleRegNo);
    if (entry.status === 'active' && entry.source === 'manual') {
      manualActive.add(entry.vehicleRegNo);
    }
  }
  return { manualActive, suppressed };
}

/**
 * Status rows matching browse filters + any expiry threshold (for CRM auto queue).
 */
export async function fetchAutoQualifyingStatusRows(prisma, query, thresholds, excludeVrns = []) {
  const expiry = parseExpiryDaysParams(thresholds);
  if (!expiry.insuranceDays && !expiry.rcDays && !expiry.fitnessDays) {
    return [];
  }
  const { whereSql, params } = buildBrowseSql(query, { expiry, excludeVrns });
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM ${TABLE} WHERE ${whereSql} ORDER BY "vehicleRegNo" ASC`,
    ...params,
  );
  return rows.map(mapRawRow);
}

/** Targeted fetch for a list of VRNs with browse filters applied. */
export async function fetchStatusRowsForVrns(prisma, query, vrns) {
  if (!vrns.length) return [];
  const where = {
    AND: [buildVehicleStatusWhere(query), { vehicleRegNo: { in: vrns } }],
  };
  return prisma.epassVehicleStatusRow.findMany({ where });
}

export async function fetchLatestVehicleStatusScrapedAt(prisma) {
  const latestRow = await prisma.epassVehicleStatusRow.findFirst({
    orderBy: { scrapedAt: 'desc' },
    select: { scrapedAt: true },
  });
  return latestRow?.scrapedAt?.toISOString() ?? null;
}
