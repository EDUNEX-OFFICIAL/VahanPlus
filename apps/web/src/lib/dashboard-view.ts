import type { DashboardKpi, DashboardKpiView, DashboardOverview } from '@/lib/dashboard-types';
import { auditLiveScrapeDates } from '@/lib/live-scrape-date-audit';

function formatCount(n: number): string {
  return n.toLocaleString('en-IN');
}

function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function dashboardQueueStateLabel(overview: DashboardOverview): string {
  const { queue } = overview;
  if (queue.isPaused) return 'Queue paused';
  const active = (queue.active ?? 0) + (queue.waiting ?? 0);
  if (active > 0) return 'Scrape running';
  return 'Queue idle';
}

export function dashboardLatestReportLabel(overview: DashboardOverview): string | null {
  if (!overview.latestSnapshot) return null;
  const audit = auditLiveScrapeDates(
    overview.latestSnapshot.reportDate,
    overview.latestSnapshot.scrapedAt,
  );
  return `Latest report ${audit.reportDateDisplay}`;
}

export function buildDashboardKpis(
  overview: DashboardOverview,
  view: DashboardKpiView,
): DashboardKpi[] {
  const jobs = overview.scrapeJobsByStatus;
  const stats = overview.latestSnapshotStats;
  const snap = overview.latestSnapshot;
  const districtHref = snap
    ? `/khanan/district?snapshotId=${encodeURIComponent(snap.id)}&reportDate=${encodeURIComponent(snap.reportDate)}`
    : '/khanan/district';

  if (view === 'operations') {
    const queueHint = overview.queue.isPaused
      ? 'Queue paused'
      : `${overview.queue.delayed ?? 0} delayed in queue`;
    return [
      {
        id: 'queue-waiting',
        label: 'Queue waiting',
        value: formatCount(overview.queue.waiting ?? 0),
        hint: queueHint,
        href: '/khanan/config',
        accent: 'indigo',
      },
      {
        id: 'queue-active',
        label: 'Queue active',
        value: formatCount(overview.queue.active ?? 0),
        hint: overview.queue.isPaused ? 'Paused' : 'Workers processing',
        href: '/khanan/config',
        accent: 'cyan',
      },
      {
        id: 'jobs-failed',
        label: 'Scrape jobs failed',
        value: formatCount(jobs.failed ?? 0),
        hint: `${formatCount(jobs.pending ?? 0)} pending`,
        href: '/khanan/config',
        accent: 'rose',
      },
      {
        id: 'jobs-completed',
        label: 'Scrape jobs done',
        value: formatCount(jobs.completed ?? 0),
        hint: `${formatCount(jobs.active ?? 0)} active now`,
        href: '/khanan/config',
        accent: 'emerald',
      },
    ];
  }

  if (view === 'data') {
    const reportHint = snap
      ? auditLiveScrapeDates(snap.reportDate, snap.scrapedAt).reportDateDisplay
      : 'No snapshot yet';
    return [
      {
        id: 'district-rows',
        label: 'District rows',
        value: formatCount(stats?.districtRows ?? 0),
        hint: reportHint,
        href: districtHref,
        accent: 'indigo',
      },
      {
        id: 'consigner-rows',
        label: 'Consigners',
        value: formatCount(stats?.consignerRows ?? 0),
        hint: `${formatCount(overview.snapshotCount)} snapshots total`,
        href: districtHref,
        accent: 'cyan',
      },
      {
        id: 'challan-rows',
        label: 'Challan lines',
        value: formatCount(stats?.challanRows ?? 0),
        hint: 'Latest snapshot',
        href: '/khanan/chalaan',
        accent: 'amber',
      },
      {
        id: 'pass-rows',
        label: 'Passes',
        value: formatCount(stats?.passRows ?? 0),
        hint: 'Latest snapshot',
        href: '/khanan/consignee',
        accent: 'emerald',
      },
    ];
  }

  const vehicleHint = formatRelativeTime(overview.vehicles.lastScrapedAt);
  return [
    {
      id: 'mcv-total',
      label: 'MCV checks',
      value: formatCount(overview.vehicles.total),
      hint: vehicleHint ? `Last check ${vehicleHint}` : 'No checks yet',
      href: '/khanan/vehicle-status',
      accent: 'indigo',
    },
    {
      id: 'portal-found',
      label: 'Portal found',
      value: formatCount(overview.vehicles.found),
      hint: 'Data on portal',
      href: '/khanan/vehicle-status',
      accent: 'emerald',
    },
    {
      id: 'portal-missing',
      label: 'Not on portal',
      value: formatCount(overview.vehicles.notFound),
      hint: 'No portal match',
      href: '/khanan/vehicle-status',
      accent: 'rose',
    },
    {
      id: 'crm-active',
      label: 'CRM active',
      value: formatCount(overview.crm.activeEntries),
      hint: `${formatCount(overview.crm.manualEntries)} manual · ${formatCount(overview.crm.removedEntries)} removed`,
      href: '/crm/vehicle-expiry',
      accent: 'cyan',
    },
  ];
}
