import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchReportHtml } from '../src/fetch.js';
import { parseDistrictTable } from '../src/parser.js';
import { validateMvpFixtures } from '../src/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(): { limit: number; offline: boolean } {
  const args = process.argv.slice(2);
  let limit = 10;
  let offline = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number.parseInt(args[i + 1], 10);
      i += 1;
    } else if (args[i] === '--offline') {
      offline = true;
    }
  }
  return { limit, offline };
}

async function main() {
  const { limit, offline } = parseArgs();

  let html: string;
  if (offline) {
    const fixture = resolve(__dirname, '../fixtures/sample.html');
    html = readFileSync(fixture, 'utf8');
    console.error(`Using offline fixture: ${fixture}`);
  } else {
    console.error('Fetching live report...');
    html = await fetchReportHtml();
  }

  const report = parseDistrictTable(html, { limit });
  const validation = validateMvpFixtures(report);

  console.log(JSON.stringify({ report, validation }, null, 2));

  if (!validation.ok) {
    console.error('Validation failed:', validation.errors.join('; '));
    process.exit(1);
  }
  console.error(`OK: ${report.rowCount} rows parsed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
