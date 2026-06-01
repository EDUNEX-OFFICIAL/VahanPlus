export const CONFIG_ID = 'default';

export const DEFAULT_DISTRICT_URL =
  'https://khanansoft.bihar.gov.in/portal/CitizenRpt/epassreportAllDist.aspx';

export function envDefaults() {
  return {
    autoFanout: process.env.BIHAR_EPASS_SKIP_FANOUT !== 'true',
    skipChallan: process.env.BIHAR_EPASS_SKIP_CHALLAN === 'true',
    skipChallanPass: process.env.BIHAR_EPASS_SKIP_CHALLAN_PASS === 'true',
    skipVehicleStatus: process.env.BIHAR_EPASS_SKIP_VEHICLE_STATUS === 'true',
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY) || 4,
    rateLimitMax: Number(process.env.BIHAR_PORTAL_RATE_LIMIT_MAX) || 2,
    rateLimitDurationMs: Number(process.env.BIHAR_PORTAL_RATE_LIMIT_DURATION_MS) || 1000,
    postDelayMs: Number(process.env.BIHAR_PORTAL_POST_DELAY_MS) || 1000,
    fanoutStaggerMs: Number(process.env.BIHAR_FANOUT_STAGGER_MS) || 0,
    fetchTimeoutMs: Number(process.env.BIHAR_FETCH_TIMEOUT_MS) || 30000,
    fetchRetries: Number(process.env.BIHAR_FETCH_RETRIES) || 3,
    storeRawCapture: process.env.STORE_RAW_CAPTURE === 'true',
    maxConsignerJobs: process.env.BIHAR_EPASS_MAX_CONSIGNER_JOBS
      ? Number(process.env.BIHAR_EPASS_MAX_CONSIGNER_JOBS)
      : null,
    districtReportUrl: process.env.BIHAR_EPASS_REPORT_URL || DEFAULT_DISTRICT_URL,
    districtRowLimit: Number(process.env.BIHAR_EPASS_ROW_LIMIT) || 44,
    scheduleCron: process.env.BIHAR_EPASS_SCHEDULE_CRON || null,
    scheduleTimezone: process.env.BIHAR_EPASS_SCHEDULE_TZ || 'Asia/Kolkata',
    defaultDistrictDate: process.env.BIHAR_EPASS_DEFAULT_DISTRICT_DATE || null,
    scheduleReportDateMode: process.env.BIHAR_EPASS_SCHEDULE_DATE_MODE || 'yesterday',
    allowDataWipe: false,
    configVersion: 1,
  };
}

export function seedDefaults() {
  return {
    id: CONFIG_ID,
    ...envDefaults(),
    maxConsignerJobs: null,
    scheduleCron: null,
  };
}

/** @typedef {'safe' | 'balanced' | 'fast'} SpeedPresetName */

export const SPEED_PRESETS = {
  safe: {
    workerConcurrency: 2,
    rateLimitMax: 1,
    rateLimitDurationMs: 1000,
    postDelayMs: 2000,
    fanoutStaggerMs: 0,
  },
  balanced: {
    workerConcurrency: 4,
    rateLimitMax: 2,
    rateLimitDurationMs: 1000,
    postDelayMs: 1000,
    fanoutStaggerMs: 0,
  },
  fast: {
    workerConcurrency: 6,
    rateLimitMax: 3,
    rateLimitDurationMs: 1000,
    postDelayMs: 500,
    fanoutStaggerMs: 0,
  },
};

/**
 * @param {SpeedPresetName} name
 */
export function getSpeedPreset(name) {
  return SPEED_PRESETS[name] ?? SPEED_PRESETS.balanced;
}

/**
 * @param {Record<string, unknown>} config
 * @returns {SpeedPresetName | 'custom'}
 */
export function detectSpeedPreset(config) {
  for (const [name, preset] of Object.entries(SPEED_PRESETS)) {
    const match = Object.entries(preset).every(([key, value]) => config[key] === value);
    if (match) return /** @type {SpeedPresetName} */ (name);
  }
  return 'custom';
}
