import { obliterateScrapeQueue, removeRepeatableScrapeJobs } from '../queues/queueMaintenance.js';

/**
 * @param {import('bullmq').Queue} queue
 */
export async function clearScrapeQueueState(queue) {
  await obliterateScrapeQueue(queue);
  await removeRepeatableScrapeJobs(queue);
}

/**
 * Fast wipe of scraped tables (avoids slow per-row cascade deletes).
 *
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
export async function wipeScrapedDatabase(prisma) {
  const before = await countScrapedRows(prisma);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`TRUNCATE TABLE processed."EpassSnapshot" CASCADE`;
    await tx.$executeRaw`TRUNCATE TABLE processed."EpassVehicleStatusRow"`;
    await tx.$executeRaw`TRUNCATE TABLE processed."VehicleRecord"`;
    await tx.$executeRaw`TRUNCATE TABLE processed."KhananRecord"`;
    await tx.$executeRaw`TRUNCATE TABLE ingest."ScrapeJob" CASCADE`;
  });

  return before;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
async function countScrapedRows(prisma) {
  const [
    snapshots,
    consigners,
    vehicleStatus,
    rawCaptures,
    scrapeJobs,
    vehicleRecords,
    khananRecords,
  ] = await Promise.all([
    prisma.epassSnapshot.count(),
    prisma.epassConsignerRow.count(),
    prisma.epassVehicleStatusRow.count(),
    prisma.rawCapture.count(),
    prisma.scrapeJob.count(),
    prisma.vehicleRecord.count(),
    prisma.khananRecord.count(),
  ]);
  return {
    snapshots,
    consigners,
    vehicleStatus,
    rawCaptures,
    scrapeJobs,
    vehicleRecords,
    khananRecords,
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {import('bullmq').Queue} queue
 */
export async function clearAllScrapedData(prisma, queue) {
  await clearScrapeQueueState(queue);
  const deleted = await wipeScrapedDatabase(prisma);

  return {
    deleted,
    message: 'All scraped data cleared.',
  };
}
