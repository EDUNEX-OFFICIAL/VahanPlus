import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LiveSnapshotRow } from '@/lib/scraper-config-types';
import {
  dedupeHistorySnapshotsByReportDate,
  sliceForHistoryPreview,
} from './khanan-config-history-view';

function row(
  id: string,
  reportDate: string,
  scrapedAt: string,
  snapshotCountForDate = 1,
): LiveSnapshotRow {
  return {
    id,
    reportDate,
    scrapedAt,
    districtRows: 1,
    consignerRows: 0,
    challanRows: 0,
    passRows: 0,
    snapshotCountForDate,
  };
}

describe('dedupeHistorySnapshotsByReportDate', () => {
  it('keeps latest scrapedAt per reportDate', () => {
    const result = dedupeHistorySnapshotsByReportDate([
      row('a', '2026-04-12', '2026-04-12T08:00:00.000Z', 2),
      row('b', '2026-04-12', '2026-04-12T18:00:00.000Z', 2),
      row('c', '2026-04-11', '2026-04-11T10:00:00.000Z', 1),
    ]);

    assert.equal(result.length, 2);
    assert.equal(result[0].id, 'b');
    assert.equal(result[0].snapshotCountForDate, 2);
    assert.equal(result[1].id, 'c');
  });

  it('sorts newest scrapedAt first', () => {
    const result = dedupeHistorySnapshotsByReportDate([
      row('old', '2026-04-01', '2026-04-01T10:00:00.000Z'),
      row('new', '2026-04-05', '2026-04-05T10:00:00.000Z'),
    ]);

    assert.equal(result[0].id, 'new');
    assert.equal(result[1].id, 'old');
  });
});

describe('sliceForHistoryPreview', () => {
  it('limits visible rows', () => {
    const items = [1, 2, 3, 4, 5];
    assert.deepEqual(sliceForHistoryPreview(items, 3), [1, 2, 3]);
  });
});
