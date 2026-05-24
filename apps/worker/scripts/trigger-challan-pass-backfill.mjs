import { getPrisma, disconnectPrisma } from '@vahan360/db';
import '../src/loadEnv.js';
import { enqueueChallanPassJobs } from '@vahan360/epass-orchestrator';

function parseArgs(argv) {
  let snapshotId = null;
  let reportDate = null;
  let missingOnly = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--report-date' && argv[i + 1]) {
      reportDate = argv[i + 1];
      i += 1;
    } else if (arg === '--missing-only') {
      missingOnly = true;
    } else if (!arg.startsWith('-')) {
      snapshotId = arg;
    }
  }

  return { snapshotId, reportDate, missingOnly };
}

const { snapshotId: argSnapshotId, reportDate, missingOnly } = parseArgs(process.argv);
const prisma = getPrisma();

let snapshot = null;

if (argSnapshotId) {
  snapshot = await prisma.epassSnapshot.findUnique({ where: { id: argSnapshotId } });
} else if (reportDate) {
  snapshot = await prisma.epassSnapshot.findFirst({
    where: { reportDate },
    orderBy: { scrapedAt: 'desc' },
  });
} else {
  snapshot = await prisma.epassSnapshot.findFirst({ orderBy: { scrapedAt: 'desc' } });
}

if (!snapshot) {
  console.error('No snapshot found. Pass snapshot id or --report-date 20-May-2026');
  process.exit(1);
}

const challanWhere = {
  consignerRow: { snapshotId: snapshot.id },
  detailUrl: { not: null },
  challanCount: { gt: 0 },
};

if (missingOnly) {
  challanWhere.passes = { none: {} };
}

const challanRows = await prisma.epassChallanRow.findMany({
  where: challanWhere,
  select: {
    id: true,
    detailUrl: true,
    challanCount: true,
    consigneeName: true,
    slNo: true,
  },
  orderBy: { slNo: 'asc' },
});

const eligible = challanRows.filter((r) => r.detailUrl && r.challanCount > 0);

console.log('Snapshot:', snapshot.id, snapshot.reportDate);
console.log(
  'Challan rows to enqueue:',
  eligible.length,
  missingOnly ? '(missing passes only)' : '(all with detailUrl)',
);

if (eligible.length === 0) {
  console.log('Nothing to enqueue.');
  await disconnectPrisma();
  process.exit(0);
}

const fanout = await enqueueChallanPassJobs(prisma, eligible);
console.log(JSON.stringify(fanout, null, 2));
console.log('Ensure worker is running: pnpm --filter @vahan360/worker dev');

await disconnectPrisma();
