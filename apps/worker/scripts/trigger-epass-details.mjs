import { getPrisma, disconnectPrisma } from '@vahan360/db';
import '../src/loadEnv.js';
import { enqueueConsignerJobsForSnapshot } from '@vahan360/epass-orchestrator';

const prisma = getPrisma();
const snapshotId = process.argv[2];

const snapshot = snapshotId
  ? await prisma.epassSnapshot.findUnique({ where: { id: snapshotId } })
  : await prisma.epassSnapshot.findFirst({ orderBy: { scrapedAt: 'desc' } });

if (!snapshot) {
  console.error('No snapshot found');
  process.exit(1);
}

const withUrls = await prisma.epassDistrictRow.count({
  where: {
    snapshotId: snapshot.id,
    OR: [
      { lesseePassDetailUrl: { not: null }, lesseePasses: { gt: 0 } },
      { dealerPassDetailUrl: { not: null }, dealerPasses: { gt: 0 } },
    ],
  },
});

console.log('Snapshot:', snapshot.id, snapshot.reportDate, 'rows with pass URLs:', withUrls);

const fanout = await enqueueConsignerJobsForSnapshot(prisma, snapshot.id, 'manual-trigger');
console.log(JSON.stringify(fanout, null, 2));
console.log('Ensure worker is running: pnpm --filter @vahan360/worker dev');

await disconnectPrisma();
