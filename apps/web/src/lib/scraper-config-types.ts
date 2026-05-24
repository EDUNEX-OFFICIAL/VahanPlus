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
  snapshotId?: string;
  date?: string | null;
  from?: string;
  to?: string;
  dayCount?: number;
  requiresConfirm?: boolean;
  error?: string;
}
