import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChallanTable } from '../src/challan-parser.js';
import { parseConsignerTable } from '../src/consigner-parser.js';
import {
  gridMetadataFromFetch,
  isPagingComplete,
  mergeRowsBySlNo,
  parsePortalPaging,
} from '../src/grid-pagination.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const challanFixture = readFileSync(resolve(__dirname, '../fixtures/challan-sample.html'), 'utf8');
const consignerFixture = readFileSync(
  resolve(__dirname, '../fixtures/consigner-arwal.html'),
  'utf8',
);

// parsePortalPaging — challan fixture (20 of 34)
{
  const paging = parsePortalPaging(challanFixture);
  assert.ok(paging);
  assert.equal(paging.start, 1);
  assert.equal(paging.end, 20);
  assert.equal(paging.total, 34);
  assert.equal(isPagingComplete(paging, paging.end), false);
  assert.equal(isPagingComplete(paging, paging.total), true);
}

// parsePortalPaging — consigner fixture (complete single page)
{
  const paging = parsePortalPaging(consignerFixture);
  assert.ok(paging);
  assert.equal(paging.start, 1);
  assert.equal(paging.end, 17);
  assert.equal(paging.total, 17);
  assert.equal(isPagingComplete(paging, paging.end), true);
}

// mergeRowsBySlNo dedupes across synthetic pages
{
  const merged = mergeRowsBySlNo([
    [
      { slNo: 1, name: 'a' },
      { slNo: 2, name: 'b' },
    ],
    [
      { slNo: 2, name: 'dup' },
      { slNo: 3, name: 'c' },
    ],
  ]);
  assert.equal(merged.length, 3);
  assert.deepEqual(
    merged.map((r) => r.slNo),
    [1, 2, 3],
  );
  assert.equal(merged[1].name, 'b');
}

// challan parser row count on page-1 fixture
{
  const report = parseChallanTable(challanFixture, 'https://example.test/challan');
  assert.equal(report.rowCount, 20);
  const paging = parsePortalPaging(challanFixture);
  assert.ok(paging);
  const meta = gridMetadataFromFetch(
    {
      pages: [challanFixture],
      portalTotal: paging.total,
      pagesFetched: 1,
      complete: false,
    },
    report.rowCount,
  );
  assert.equal(meta.portalTotal, 34);
  assert.equal(meta.complete, false);
}

// consigner parser complete metadata
{
  const report = parseConsignerTable(consignerFixture, 'https://example.test/consigner');
  assert.equal(report.rowCount, 17);
  const paging = parsePortalPaging(consignerFixture);
  assert.ok(paging);
  const meta = gridMetadataFromFetch(
    {
      pages: [consignerFixture],
      portalTotal: paging.total,
      pagesFetched: 1,
      complete: true,
    },
    report.rowCount,
  );
  assert.equal(meta.complete, true);
}

console.log('grid-pagination tests OK');
