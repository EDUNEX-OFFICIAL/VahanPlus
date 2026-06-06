import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gridTableFingerprint } from '../src/http/client.js';
import { parseChallanTable } from '../src/challan-parser.js';
import { parseConsignerTable } from '../src/consigner-parser.js';
import {
  gridMetadataFromFetch,
  isPagingComplete,
  mergePaginatedRows,
  parseGridPageNumbers,
  parsePortalPaging,
  unionHtmlPagesByFingerprint,
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

// parseGridPageNumbers from challan fixture
{
  const pages = parseGridPageNumbers(challanFixture);
  assert.deepEqual(pages, [2]);
}

// mergePaginatedRows keeps rows when portal restarts slNo on page 2
{
  const merged = mergePaginatedRows(
    [
      [
        { slNo: 1, name: 'a' },
        { slNo: 2, name: 'b' },
      ],
      [
        { slNo: 1, name: 'u' },
        { slNo: 2, name: 'v' },
        { slNo: 3, name: 'w' },
      ],
    ],
    (row) => row.name,
  );
  assert.equal(merged.length, 5);
}

// unionHtmlPagesByFingerprint skips duplicate table HTML
{
  const fp = gridTableFingerprint(challanFixture);
  const dup = { pages: [challanFixture, challanFixture], duplicatePagesSkipped: 0 };
  const union = unionHtmlPagesByFingerprint([challanFixture, challanFixture]);
  assert.equal(union.pages.length, 1);
  assert.equal(union.duplicatePagesSkipped, 1);
  assert.equal(gridTableFingerprint(challanFixture), fp);
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
      duplicatePagesSkipped: 0,
      complete: false,
    },
    report.rowCount,
    [20],
  );
  assert.equal(meta.portalTotal, 34);
  assert.equal(meta.complete, false);
  assert.ok(meta.incompleteReason?.includes('34'));
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
      duplicatePagesSkipped: 0,
      complete: true,
    },
    report.rowCount,
    [17],
  );
  assert.equal(meta.complete, true);
}

console.log('grid-pagination tests OK');
