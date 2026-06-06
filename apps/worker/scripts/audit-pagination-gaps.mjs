/**
 * Audit portal-pagination gaps in stored Khanan data.
 * Usage: node apps/worker/scripts/audit-pagination-gaps.mjs [--report-date DD-MM-YYYY]
 */
import { getPrisma, disconnectPrisma } from '@vahanplus/db';
import '../src/loadEnv.js';

function parseArgs(argv) {
  let reportDate = null;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--report-date' && argv[i + 1]) {
      reportDate = argv[i + 1];
      i += 1;
    }
  }
  return { reportDate };
}

const { reportDate } = parseArgs(process.argv);
const prisma = getPrisma();

const snapshot = reportDate
  ? await prisma.epassSnapshot.findFirst({
      where: { reportDate },
      orderBy: { scrapedAt: 'desc' },
    })
  : await prisma.epassSnapshot.findFirst({ orderBy: { scrapedAt: 'desc' } });

if (!snapshot) {
  console.log('No snapshot found.');
  await disconnectPrisma();
  process.exit(0);
}

const aurangabadDistrict = await prisma.epassDistrictRow.findFirst({
  where: {
    snapshotId: snapshot.id,
    dmoName: { contains: 'AURANGABAD', mode: 'insensitive' },
  },
});

let aurangabadLesseeCount = 0;
if (aurangabadDistrict) {
  aurangabadLesseeCount = await prisma.epassConsignerRow.count({
    where: {
      districtRowId: aurangabadDistrict.id,
      operatorType: 'lessee',
    },
  });
}

const incompletePassRows = await prisma.epassChallanRow.findMany({
  where: {
    consignerRow: { districtRow: { snapshotId: snapshot.id } },
    challanCount: { gt: 0 },
  },
  include: {
    _count: { select: { passes: true } },
    consignerRow: {
      include: { districtRow: { select: { dmoName: true } } },
    },
  },
});

const gaps = incompletePassRows
  .filter((row) => row._count.passes < row.challanCount)
  .map((row) => ({
    district: row.consignerRow.districtRow.dmoName,
    consigner: row.consignerRow.consignerName,
    consignee: row.consigneeName,
    portalPasses: row.challanCount,
    storedPasses: row._count.passes,
    missing: row.challanCount - row._count.passes,
  }))
  .sort((a, b) => b.missing - a.missing);

console.log('Pagination gap audit');
console.log('--------------------');
console.log(`Snapshot: ${snapshot.reportDate} (${snapshot.id})`);
console.log(`AURANGABAD lessee consigners stored: ${aurangabadLesseeCount}`);
console.log(`Incomplete pass rows: ${gaps.length}`);
for (const gap of gaps.slice(0, 15)) {
  console.log(
    `  ${gap.district} | ${gap.consigner} | ${gap.consignee}: portal ${gap.portalPasses}, stored ${gap.storedPasses} (missing ${gap.missing})`,
  );
}
if (gaps.length > 15) {
  console.log(`  ... and ${gaps.length - 15} more`);
}

await disconnectPrisma();
