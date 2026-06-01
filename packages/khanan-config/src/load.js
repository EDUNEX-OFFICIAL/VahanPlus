import { CONFIG_ID, envDefaults } from './defaults.js';

const CACHE_TTL_MS = 5000;

/** @type {{ config: Record<string, unknown> | null; expiresAt: number }} */
const cache = { config: null, expiresAt: 0 };

function rowToConfig(row) {
  return {
    id: row.id,
    autoFanout: row.autoFanout,
    skipChallan: row.skipChallan,
    skipChallanPass: row.skipChallanPass,
    skipVehicleStatus: row.skipVehicleStatus,
    workerConcurrency: row.workerConcurrency,
    rateLimitMax: row.rateLimitMax,
    rateLimitDurationMs: row.rateLimitDurationMs,
    postDelayMs: row.postDelayMs,
    fanoutStaggerMs: row.fanoutStaggerMs,
    fetchTimeoutMs: row.fetchTimeoutMs,
    fetchRetries: row.fetchRetries,
    storeRawCapture: row.storeRawCapture,
    maxConsignerJobs: row.maxConsignerJobs,
    districtReportUrl: row.districtReportUrl,
    districtRowLimit: row.districtRowLimit,
    scheduleCron: row.scheduleCron,
    scheduleTimezone: row.scheduleTimezone,
    defaultDistrictDate: row.defaultDistrictDate,
    scheduleReportDateMode: row.scheduleReportDateMode ?? 'yesterday',
    allowDataWipe: row.allowDataWipe ?? false,
    configVersion: row.configVersion,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function clearKhananConfigCache() {
  cache.config = null;
  cache.expiresAt = 0;
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
export async function loadKhananConfig(prisma) {
  const now = Date.now();
  if (cache.config && cache.expiresAt > now) {
    return cache.config;
  }

  const row = await prisma.khananScraperConfig.findUnique({
    where: { id: CONFIG_ID },
  });

  const config = row
    ? rowToConfig(row)
    : {
        id: CONFIG_ID,
        ...envDefaults(),
        updatedAt: new Date().toISOString(),
      };

  cache.config = config;
  cache.expiresAt = now + CACHE_TTL_MS;
  return config;
}

/**
 * HTTP overrides injected into scrape job metadata by the worker.
 * @param {Record<string, unknown>} config
 */
export function httpMetadataOverrides(config) {
  return {
    postDelayMs: config.postDelayMs,
    timeoutMs: config.fetchTimeoutMs,
    retries: config.fetchRetries,
  };
}

/**
 * BullMQ worker limiter options from config.
 * @param {Record<string, unknown>} config
 */
export function rateLimiterFromConfig(config) {
  return {
    max: Number(config.rateLimitMax) > 0 ? Number(config.rateLimitMax) : 2,
    duration: Number(config.rateLimitDurationMs) > 0 ? Number(config.rateLimitDurationMs) : 1000,
  };
}
