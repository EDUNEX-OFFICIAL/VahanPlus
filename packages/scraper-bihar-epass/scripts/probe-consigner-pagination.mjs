/**
 * Live probe: fetch consigner grid page 1 + page 2 and compare row counts.
 * Usage:
 *   node packages/scraper-bihar-epass/scripts/probe-consigner-pagination.mjs <url>
 *   node packages/scraper-bihar-epass/scripts/probe-consigner-pagination.mjs --aurangabad-lessee
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
require(resolve(repoRoot, 'apps/worker/src/loadEnv.js'));

import { getPrisma, disconnectPrisma } from '@vahanplus/db';
import { parseConsignerTable } from '../dist/consigner-parser.js';
import {
  fetchAllGridPages,
  parsePortalPaging,
} from '../dist/grid-pagination.js';

function parseArgs(argv) {
  const args = { url: null, aurangabadLessee: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--aurangabad-lessee') args.aurangabadLessee = true;
    else if (!argv[i].startsWith('-')) args.url = argv[i];
  }
  return args;
}

const args = parseArgs(process.argv);
let url = args.url;

if (args.aurangabadLessee) {
  const prisma = getPrisma();
  const row = await prisma.epassDistrictRow.findFirst({
    where: { dmoName: { contains: 'AURANGABAD', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    select: { lesseePassDetailUrl: true, dmoName: true },
  });
  await disconnectPrisma();
  if (!row?.lesseePassDetailUrl) {
    console.error('No Aurangabad lessee URL in DB');
    process.exit(1);
  }
  url = row.lesseePassDetailUrl;
  console.log('Using DB URL for', row.dmoName);
}

if (!url) {
  console.error('Usage: probe-consigner-pagination.mjs <url> | --aurangabad-lessee');
  process.exit(1);
}

const fetch = await fetchAllGridPages(url, { postDelayMs: 500 });
console.log('portalTotal', fetch.portalTotal);
console.log('pagesFetched', fetch.pagesFetched);
console.log('duplicatePagesSkipped', fetch.duplicatePagesSkipped);
console.log('complete', fetch.complete);

for (let i = 0; i < fetch.pages.length; i += 1) {
  const html = fetch.pages[i];
  const paging = parsePortalPaging(html);
  const rows = parseConsignerTable(html, url).rows;
  const first = rows[0]?.consignerName?.slice(0, 50) ?? '—';
  const last = rows.at(-1)?.consignerName?.slice(0, 50) ?? '—';
  console.log(`page[${i}] paging`, paging, 'rows', rows.length, 'first', first, 'last', last);
}

const allRows = fetch.pages.flatMap((html) => parseConsignerTable(html, url).rows);
const unique = new Set(allRows.map((r) => r.consignerName.trim().toLowerCase()));
console.log('total parsed rows (no dedupe)', allRows.length);
console.log('unique consigner names', unique.size);
