import '../src/loadEnv.js';
import { getPrisma, disconnectPrisma } from '@vahanplus/db';
import { resolveScraper } from '@vahanplus/scraper-core';
import { persistEpassReport } from '../src/epassEtl.js';
import { enqueueConsignerJobsForSnapshot } from '@vahanplus/epass-orchestrator';

const URL =
  'https://khanansoft.bihar.gov.in/portal/CitizenRpt/epassreportAllDist.aspx';
const limit = Number(process.env.LIMIT || '10');

const prisma = getPrisma();
const scraper = resolveScraper('bihar_epass');

const result = await scraper.scrape({
  type: 'bihar_epass',
  target: URL,
  metadata: { limit },
});

if (!result.success || !result.data) {
  console.error('Scrape failed:', result.error);
  process.exit(1);
}

const etl = await persistEpassReport(prisma, result.data, 'integration-test');

let fanout = null;
if (process.env.SKIP_DETAIL_FANOUT !== 'true' && etl.snapshotId) {
  fanout = await enqueueConsignerJobsForSnapshot(prisma, etl.snapshotId, 'integration-test');
}

console.log(
  JSON.stringify(
    {
      rowCount: result.data.rowCount,
      etl,
      fanout,
      reportDate: result.data.reportDate,
    },
    null,
    2,
  ),
);

await disconnectPrisma();
