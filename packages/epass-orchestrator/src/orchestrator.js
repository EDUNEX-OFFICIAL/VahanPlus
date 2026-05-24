import { bulkEnqueueScrapeJobs } from './bulk.js';
import { getOrchestratorConfig } from './config.js';
import { normalizeVehicleRegNo } from './normalizeVrn.js';
import { getScrapeQueue } from './queue.js';

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 */
async function buildStaggerDelayFn(prisma) {
  const { fanoutStaggerMs } = await getOrchestratorConfig(prisma);
  return (index) => index * fanoutStaggerMs;
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {{ limit?: number }} [options]
 */
export async function findMissingVehicleRegNos(prisma, options = {}) {
  const limit = options.limit;
  const rows =
    limit != null && limit > 0
      ? await prisma.$queryRaw`
          SELECT DISTINCT UPPER(REPLACE(TRIM(p."vehicleRegNo"), ' ', '')) AS "vehicleRegNo"
          FROM "EpassChallanPassRow" p
          WHERE p."vehicleRegNo" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "EpassVehicleStatusRow" v
            WHERE v."vehicleRegNo" = UPPER(REPLACE(TRIM(p."vehicleRegNo"), ' ', ''))
          )
          ORDER BY 1
          LIMIT ${limit}
        `
      : await prisma.$queryRaw`
          SELECT DISTINCT UPPER(REPLACE(TRIM(p."vehicleRegNo"), ' ', '')) AS "vehicleRegNo"
          FROM "EpassChallanPassRow" p
          WHERE p."vehicleRegNo" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "EpassVehicleStatusRow" v
            WHERE v."vehicleRegNo" = UPPER(REPLACE(TRIM(p."vehicleRegNo"), ' ', ''))
          )
          ORDER BY 1
        `;

  return rows.map((r) => r.vehicleRegNo).filter((vrn) => vrn != null && String(vrn).length > 0);
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {string} snapshotId
 * @param {string} [parentJobId]
 */
export async function enqueueConsignerJobsForSnapshot(prisma, snapshotId, parentJobId) {
  const { maxConsignerJobs } = await getOrchestratorConfig(prisma);
  const districtRows = await prisma.epassDistrictRow.findMany({
    where: { snapshotId },
    orderBy: { slNo: 'asc' },
  });

  const tasks = [];
  for (const row of districtRows) {
    if (row.lesseePassDetailUrl && row.lesseePasses > 0) {
      tasks.push({ row, operatorType: 'lessee', url: row.lesseePassDetailUrl });
    }
    if (row.dealerPassDetailUrl && row.dealerPasses > 0) {
      tasks.push({ row, operatorType: 'dealer', url: row.dealerPassDetailUrl });
    }
  }

  const limited = maxConsignerJobs ? tasks.slice(0, maxConsignerJobs) : tasks;
  const queue = getScrapeQueue();
  const getDelayMs = await buildStaggerDelayFn(prisma);

  return bulkEnqueueScrapeJobs(prisma, queue, {
    type: 'bihar_epass_consigner',
    items: limited,
    getTarget: (item) => item.url,
    getMetadata: (item) => ({
      districtRowId: item.row.id,
      snapshotId,
      operatorType: item.operatorType,
      parentJobId,
    }),
    getDelayMs,
  });
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {string} districtRowId
 * @param {'lessee'|'dealer'} operatorType
 * @param {string} url
 * @param {string} [snapshotId]
 */
export async function enqueueSingleConsignerJob(
  prisma,
  districtRowId,
  operatorType,
  url,
  snapshotId,
) {
  const queue = getScrapeQueue();
  const scrapeJob = await prisma.scrapeJob.create({
    data: { type: 'bihar_epass_consigner', target: url, status: 'pending' },
  });
  await queue.add(
    'bihar_epass_consigner',
    {
      jobId: scrapeJob.id,
      type: 'bihar_epass_consigner',
      target: url,
      metadata: { districtRowId, snapshotId, operatorType },
    },
    { jobId: scrapeJob.id },
  );
  return scrapeJob.id;
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {Array<{ id: string; challanDetailUrl: string | null; challanCount: number }>} consignerRows
 */
export async function enqueueChallanJobsForConsigners(prisma, consignerRows) {
  const { skipChallan } = await getOrchestratorConfig(prisma);
  if (skipChallan) {
    return { enqueued: 0, skipped: true };
  }

  const tasks = consignerRows.filter((r) => r.challanDetailUrl && r.challanCount > 0);
  const queue = getScrapeQueue();
  const getDelayMs = await buildStaggerDelayFn(prisma);

  return bulkEnqueueScrapeJobs(prisma, queue, {
    type: 'bihar_epass_challan',
    items: tasks,
    getTarget: (row) => row.challanDetailUrl,
    getMetadata: (row) => ({ consignerRowId: row.id }),
    getDelayMs,
  });
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {Array<{ id: string; detailUrl: string | null; challanCount: number }>} challanRows
 */
export async function enqueueChallanPassJobs(prisma, challanRows) {
  const { skipChallanPass } = await getOrchestratorConfig(prisma);
  if (skipChallanPass) {
    return { enqueued: 0, skipped: true };
  }

  const tasks = challanRows.filter((r) => r.detailUrl && r.challanCount > 0);
  const queue = getScrapeQueue();
  const getDelayMs = await buildStaggerDelayFn(prisma);

  return bulkEnqueueScrapeJobs(prisma, queue, {
    type: 'bihar_epass_challan_pass',
    items: tasks,
    getTarget: (row) => row.detailUrl,
    getMetadata: (row) => ({ challanRowId: row.id }),
    getDelayMs,
  });
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {string[]} vehicleRegNos
 * @param {string} [parentJobId]
 */
export async function enqueueVehicleStatusJobs(prisma, vehicleRegNos, parentJobId) {
  const { skipVehicleStatus, mcvVehicleStatusUrl } = await getOrchestratorConfig(prisma);
  if (skipVehicleStatus) {
    return { enqueued: 0, skipped: true };
  }

  const normalized = [
    ...new Set(
      vehicleRegNos
        .map((vrn) => normalizeVehicleRegNo(vrn))
        .filter((vrn) => vrn != null),
    ),
  ];

  if (normalized.length === 0) {
    return { enqueued: 0 };
  }

  const existing = await prisma.epassVehicleStatusRow.findMany({
    where: { vehicleRegNo: { in: normalized } },
    select: { vehicleRegNo: true },
  });
  const existingSet = new Set(existing.map((r) => r.vehicleRegNo));
  const missing = normalized.filter((vrn) => !existingSet.has(vrn));

  if (missing.length === 0) {
    return { enqueued: 0, skippedExisting: normalized.length };
  }

  const queue = getScrapeQueue();
  const getDelayMs = await buildStaggerDelayFn(prisma);

  const result = await bulkEnqueueScrapeJobs(prisma, queue, {
    type: 'bihar_mcv_vehicle_status',
    items: missing,
    getTarget: () => mcvVehicleStatusUrl,
    getMetadata: (vehicleRegNo) => ({
      vehicleRegNo,
      parentJobId,
    }),
    getDelayMs,
  });

  return { ...result, skippedExisting: existingSet.size };
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {{ limit?: number }} [options]
 */
export async function enqueueMissingVehicleStatusFromPasses(prisma, options = {}) {
  const missing =
    options.limit != null && options.limit > 0
      ? await findMissingVehicleRegNos(prisma, { limit: options.limit })
      : await findMissingVehicleRegNos(prisma);

  return enqueueVehicleStatusJobs(prisma, missing);
}

/**
 * @param {import('@vahan360/db').PrismaClient} prisma
 * @param {string} challanRowId
 */
export async function getVehicleRegNosForChallanRow(prisma, challanRowId) {
  const passRows = await prisma.epassChallanPassRow.findMany({
    where: { challanRowId, vehicleRegNo: { not: null } },
    select: { vehicleRegNo: true },
    distinct: ['vehicleRegNo'],
  });
  return passRows.map((r) => r.vehicleRegNo).filter((vrn) => vrn != null);
}
