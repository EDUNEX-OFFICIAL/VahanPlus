import { getPrisma, disconnectPrisma } from '@vahan360/db';

const prisma = getPrisma();

const statusCount = await prisma.epassVehicleStatusRow.count();
const found = await prisma.epassVehicleStatusRow.count({ where: { found: true } });
const notFound = await prisma.epassVehicleStatusRow.count({ where: { found: false } });
const latest = await prisma.epassVehicleStatusRow.findFirst({
  orderBy: { scrapedAt: 'desc' },
  select: { scrapedAt: true, vehicleRegNo: true },
});

const passRows = await prisma.epassChallanPassRow.findMany({
  where: { vehicleRegNo: { not: null } },
  select: { vehicleRegNo: true },
  distinct: ['vehicleRegNo'],
});

const mcvJobs = await prisma.scrapeJob.groupBy({
  by: ['status'],
  where: { type: 'bihar_mcv_vehicle_status' },
  _count: true,
});

const vehicleRecord = await prisma.vehicleRecord.count();

console.log(
  JSON.stringify(
    {
      pages: {
        vehicleData: 'placeholder only — no UI/API wired',
        vehicleStatus: 'MCV scrape data — check /khanan/vehicle-status',
      },
      epassVehicleStatusRow: {
        total: statusCount,
        found,
        notFound,
        missingFromPasses: Math.max(0, passRows.length - statusCount),
        latestScrape: latest,
      },
      challanPassDistinctVrns: passRows.length,
      mcvScrapeJobsByStatus: mcvJobs,
      legacyVehicleRecordCount: vehicleRecord,
    },
    null,
    2,
  ),
);

await disconnectPrisma();
