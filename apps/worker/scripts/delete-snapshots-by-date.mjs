/**
 * Delete all EpassSnapshot rows (and cascaded data) for given report dates.
 * Usage:
 *   node apps/worker/scripts/delete-snapshots-by-date.mjs --date 04-Jun-2026 --date 05-Jun-2026
 */
import { getPrisma, disconnectPrisma } from '@vahanplus/db';
import '../src/loadEnv.js';

function parseArgs(argv) {
  const dates = [];
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--date' && argv[i + 1]) {
      dates.push(argv[i + 1]);
      i += 1;
    }
  }
  return dates;
}

const dates = parseArgs(process.argv);
if (dates.length === 0) {
  console.error('Provide at least one --date DD-Mon-YYYY');
  process.exit(1);
}

const prisma = getPrisma();

async function counts() {
  const [snapshots, consigners, challans, passes] = await Promise.all([
    prisma.epassSnapshot.count({ where: { reportDate: { in: dates } } }),
    prisma.epassConsignerRow.count({
      where: { districtRow: { snapshot: { reportDate: { in: dates } } } },
    }),
    prisma.epassChallanRow.count({
      where: { consignerRow: { districtRow: { snapshot: { reportDate: { in: dates } } } } },
    }),
    prisma.epassChallanPassRow.count({
      where: {
        challanRow: {
          consignerRow: { districtRow: { snapshot: { reportDate: { in: dates } } } },
        },
      },
    }),
  ]);
  return { snapshots, consigners, challans, passes };
}

const before = await counts();
console.log('Before delete for', dates.join(', '));
console.log(before);

const listed = await prisma.epassSnapshot.findMany({
  where: { reportDate: { in: dates } },
  select: { id: true, reportDate: true, scrapedAt: true },
  orderBy: { scrapedAt: 'desc' },
});
console.log(
  'Snapshots to delete:',
  listed.map((s) => `${s.reportDate} ${s.id}`).join('\n  '),
);

const result = await prisma.epassSnapshot.deleteMany({
  where: { reportDate: { in: dates } },
});

const after = await counts();
console.log('Deleted snapshots:', result.count);
console.log('After delete');
console.log(after);

await disconnectPrisma();
