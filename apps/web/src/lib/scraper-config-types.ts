export type SpeedPreset = 'safe' | 'balanced' | 'fast' | 'custom';

export interface KhananScraperConfig {
  id: string;
  autoFanout: boolean;
  skipChallan: boolean;
  skipChallanPass: boolean;
  skipVehicleStatus: boolean;
  workerConcurrency: number;
  rateLimitMax: number;
  rateLimitDurationMs: number;
  postDelayMs: number;
  fanoutStaggerMs: number;
  fetchTimeoutMs: number;
  fetchRetries: number;
  storeRawCapture: boolean;
  maxConsignerJobs: number | null;
  districtReportUrl: string;
  districtRowLimit: number;
  scheduleCron: string | null;
  scheduleTimezone: string;
  defaultDistrictDate: string | null;
  scheduleReportDateMode: 'yesterday' | 'today' | 'none';
  allowDataWipe: boolean;
  configVersion: number;
  updatedAt: string;
  speedPreset: SpeedPreset;
}

export interface ScraperConfigStatus {
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
  latestSnapshot: {
    id: string;
    reportDate: string;
    scrapedAt: string;
  } | null;
  latestSnapshotStats: {
    districtRows: number;
    consignerRows: number;
    challanRows: number;
    passRows: number;
  } | null;
  /** True when Khanan Config "Allow clear all data" is enabled */
  allowDataWipe: boolean;
}

export interface ScraperConfigResponse {
  config: KhananScraperConfig;
  status: ScraperConfigStatus;
}

export type KhananScraperConfigPatch = Partial<
  Omit<KhananScraperConfig, 'id' | 'configVersion' | 'updatedAt' | 'speedPreset'>
> & {
  speedPreset?: 'safe' | 'balanced' | 'fast';
  maxConsignerJobs?: number | null;
  scheduleCron?: string | null;
  defaultDistrictDate?: string | null;
  scheduleReportDateMode?: 'yesterday' | 'today' | 'none';
};

export interface ScraperJobListItem {
  id: string;
  type: string;
  status: string;
  target: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionResult {
  message?: string;
  jobId?: string;
  enqueued?: number;
  eligible?: number;
  limit?: number;
  paused?: boolean;
  removedFromQueue?: number;
  cancelledPending?: number;
  snapshotId?: string;
  date?: string | null;
  from?: string;
  to?: string;
  dayCount?: number;
  requiresConfirm?: boolean;
  error?: string;
}

export interface LiveSnapshotRow {
  id: string;
  reportDate: string;
  scrapedAt: string;
  districtRows: number;
  consignerRows: number;
  challanRows: number;
  passRows: number;
  snapshotCountForDate: number;
}

export interface LiveActiveJob {
  id: string;
  type: string;
  target: string;
  progress?: number;
  data?: unknown;
}

export interface ScraperLiveResponse {
  queue: ScraperConfigStatus['queue'];
  scrapeJobsByStatus: Record<string, number>;
  snapshots: LiveSnapshotRow[];
  activeJobs: LiveActiveJob[];
}

export interface ClearDataResult {
  deleted: {
    vehicleStatus: number;
    snapshots: number;
    consigners: number;
    rawCaptures: number;
    scrapeJobs: number;
    vehicleRecords: number;
    khananRecords: number;
  };
  message?: string;
}
