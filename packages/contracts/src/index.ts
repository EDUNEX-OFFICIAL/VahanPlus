import { z } from 'zod';

export const QUEUE_NAMES = {
  SCRAPE: 'scrape',
  VEHICLE: 'scrape:vehicle',
  KHANAN: 'scrape:khanan',
  SYSTEM_HEALTH: 'system:health',
  REPORT_AGGREGATE: 'report_aggregate',
} as const;

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed';

export const ScrapeJobTypeSchema = z.enum([
  'vehicle',
  'khanan',
  'health',
  'bihar_epass',
  'bihar_epass_consigner',
  'bihar_epass_challan',
  'bihar_epass_challan_pass',
  'bihar_mcv_vehicle_status',
  'khanan_bulk_import',
  'khanan_bulk_export',
  'rc_advance_fetch',
  'report_aggregate',
  'report_aggregate_rebuild',
]);
export type ScrapeJobType = z.infer<typeof ScrapeJobTypeSchema>;

export const ScrapeJobPayloadSchema = z.object({
  type: ScrapeJobTypeSchema,
  target: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type ScrapeJobPayload = z.infer<typeof ScrapeJobPayloadSchema>;

export interface JobResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ScrapeJobResponse {
  id: string;
  status: JobStatus;
  type: ScrapeJobType;
  target: string;
  createdAt: string;
  updatedAt: string;
  result?: JobResult;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
}

export interface LoginResponse {
  user: AuthUser;
}

/** HttpOnly session cookie set by api-express on login; read by Next.js middleware. */
export const SESSION_COOKIE_NAME = 'vahanplus_session';

/** Matches JWT `expiresIn` on api-express login (8h). */
export const SESSION_MAX_AGE_SEC = 8 * 60 * 60;

export const SpeedPresetSchema = z.enum(['safe', 'balanced', 'fast']);

export const KhananScraperConfigPatchSchema = z
  .object({
    autoFanout: z.boolean().optional(),
    skipChallan: z.boolean().optional(),
    skipChallanPass: z.boolean().optional(),
    skipVehicleStatus: z.boolean().optional(),
    workerConcurrency: z.number().int().min(1).max(8).optional(),
    rateLimitMax: z.number().int().min(1).max(10).optional(),
    rateLimitDurationMs: z.number().int().min(500).max(10_000).optional(),
    postDelayMs: z.number().int().min(0).max(10_000).optional(),
    fanoutStaggerMs: z.number().int().min(0).max(5000).optional(),
    fetchTimeoutMs: z.number().int().min(5000).max(120_000).optional(),
    fetchRetries: z.number().int().min(0).max(10).optional(),
    storeRawCapture: z.boolean().optional(),
    maxConsignerJobs: z.number().int().min(1).nullable().optional(),
    districtReportUrl: z.string().url().optional(),
    districtRowLimit: z.number().int().min(1).max(200).optional(),
    scheduleCron: z.string().min(1).nullable().optional(),
    scheduleTimezone: z.string().min(1).optional(),
    defaultDistrictDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    districtRangeFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    districtRangeTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    scheduleReportDateMode: z.enum(['yesterday', 'today', 'none']).optional(),
    allowDataWipe: z.boolean().optional(),
    speedPreset: SpeedPresetSchema.optional(),
  })
  .strict();

export type KhananScraperConfigPatch = z.infer<typeof KhananScraperConfigPatchSchema>;

export const CrmConfigPatchSchema = z
  .object({
    insuranceExpiryDays: z.number().int().min(0).max(365).optional(),
    rcExpiryDays: z.number().int().min(0).max(365).optional(),
    fitnessExpiryDays: z.number().int().min(0).max(365).optional(),
    rcAdvanceEnabled: z.boolean().optional(),
  })
  .strict();

export type CrmConfigPatch = z.infer<typeof CrmConfigPatchSchema>;

export interface CrmConfigDto {
  id: string;
  insuranceExpiryDays: number;
  rcExpiryDays: number;
  fitnessExpiryDays: number;
  rcAdvanceEnabled: boolean;
  configVersion: number;
  updatedAt: string;
}
