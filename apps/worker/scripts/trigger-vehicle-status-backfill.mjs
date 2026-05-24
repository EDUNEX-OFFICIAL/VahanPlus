import '../src/loadEnv.js';
import { getPrisma, disconnectPrisma } from '@vahanplus/db';
import { enqueueMissingVehicleStatusFromPasses } from '@vahanplus/epass-orchestrator';

function parseArgs(argv) {
  let limit = undefined;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--limit' && argv[i + 1]) {
      limit = Number(argv[i + 1]);
      i += 1;
    }
  }
  return { limit: Number.isFinite(limit) && limit > 0 ? limit : undefined };
}

const { limit } = parseArgs(process.argv);
const prisma = getPrisma();

const passCount = await prisma.epassChallanPassRow.count({
  where: { vehicleRegNo: { not: null } },
});

const statusCount = await prisma.epassVehicleStatusRow.count();

console.log('Pass rows with vehicleRegNo:', passCount);
console.log('Existing vehicle status rows:', statusCount);
if (limit) console.log('Enqueue limit:', limit);

const fanout = await enqueueMissingVehicleStatusFromPasses(prisma, { limit });
console.log(JSON.stringify(fanout, null, 2));
console.log('Ensure worker is running: pnpm dev (or pnpm --filter @vahanplus/worker dev)');

await disconnectPrisma();
