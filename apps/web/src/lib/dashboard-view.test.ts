import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DashboardOverview } from './dashboard-types';
import { buildDashboardKpis, dashboardQueueStateLabel } from './dashboard-view';

const baseOverview: DashboardOverview = {
  queue: { waiting: 3, active: 1, isPaused: false, failed: 0 },
  scrapeJobsByStatus: { completed: 100, failed: 2, pending: 5, active: 1 },
  snapshotCount: 24,
  latestSnapshot: {
    id: 'snap-1',
    reportDate: '05-Jun-2026',
    scrapedAt: '2026-06-05T10:00:00.000Z',
    sourceUrl: null,
  },
  latestSnapshotStats: {
    districtRows: 38,
    consignerRows: 120,
    challanRows: 400,
    passRows: 800,
  },
  recentSnapshots: [],
  vehicles: { total: 500, found: 400, notFound: 100, lastScrapedAt: '2026-06-05T09:00:00.000Z' },
  crm: { activeEntries: 12, manualEntries: 3, removedEntries: 1 },
  generatedAt: '2026-06-06T08:00:00.000Z',
};

describe('buildDashboardKpis', () => {
  it('returns 4 operations KPIs', () => {
    const kpis = buildDashboardKpis(baseOverview, 'operations');
    assert.equal(kpis.length, 4);
    assert.equal(kpis[0].id, 'queue-waiting');
    assert.equal(kpis[0].value, '3');
  });

  it('returns 4 data KPIs with district href', () => {
    const kpis = buildDashboardKpis(baseOverview, 'data');
    assert.equal(kpis.length, 4);
    assert.match(kpis[0].href, /snapshotId=snap-1/);
    assert.equal(kpis[0].value, '38');
  });

  it('returns vehicles KPIs without fake deltas', () => {
    const kpis = buildDashboardKpis(baseOverview, 'vehicles');
    assert.equal(kpis.length, 4);
    assert.ok(!('delta' in (kpis[0] as object)));
    assert.equal(kpis[0].value, '500');
  });
});

describe('dashboardQueueStateLabel', () => {
  it('reports paused state', () => {
    assert.equal(
      dashboardQueueStateLabel({
        ...baseOverview,
        queue: { ...baseOverview.queue, isPaused: true },
      }),
      'Queue paused',
    );
  });
});
