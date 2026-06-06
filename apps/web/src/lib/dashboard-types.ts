export interface DashboardSnapshotStats {
  districtRows: number;
  consignerRows: number;
  challanRows: number;
  passRows: number;
}

export interface DashboardSnapshotRef {
  id: string;
  reportDate: string;
  scrapedAt: string;
  sourceUrl: string | null;
}

export interface DashboardRecentSnapshot extends DashboardSnapshotRef {
  districtRows: number;
  consignerRows: number;
  challanRows: number;
  passRows: number;
  snapshotCountForDate: number;
}

export interface DashboardOverview {
  queue: {
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
    delayed?: number;
    paused?: number;
    isPaused: boolean;
  };
  scrapeJobsByStatus: Record<string, number>;
  snapshotCount: number;
  latestSnapshot: DashboardSnapshotRef | null;
  latestSnapshotStats: DashboardSnapshotStats | null;
  recentSnapshots: DashboardRecentSnapshot[];
  vehicles: {
    total: number;
    found: number;
    notFound: number;
    lastScrapedAt: string | null;
  };
  crm: {
    activeEntries: number;
    manualEntries: number;
    removedEntries: number;
  };
  generatedAt: string;
}

export type DashboardKpiView = 'operations' | 'data' | 'vehicles';

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  hint: string;
  href: string;
  accent?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose';
}
