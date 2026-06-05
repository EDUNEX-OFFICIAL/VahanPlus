export const CRM_CONFIG_ID = 'default';

export const CRM_CONFIG_DEFAULTS = {
  insuranceExpiryDays: 30,
  rcExpiryDays: 30,
  fitnessExpiryDays: 30,
  rcAdvanceEnabled: true,
};

const CACHE_TTL_MS = 5000;

/** @type {{ config: Record<string, unknown> | null; expiresAt: number }} */
const cache = { config: null, expiresAt: 0 };

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
function mapCrmConfigRow(row) {
  return {
    id: row.id,
    insuranceExpiryDays: row.insuranceExpiryDays,
    rcExpiryDays: row.rcExpiryDays,
    fitnessExpiryDays: row.fitnessExpiryDays,
    rcAdvanceEnabled: row.rcAdvanceEnabled,
    configVersion: row.configVersion,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 */
export async function loadCrmConfig(prisma) {
  if (cache.config && Date.now() < cache.expiresAt) {
    return cache.config;
  }

  const row = await prisma.crmConfig.findUnique({ where: { id: CRM_CONFIG_ID } });
  const config = row
    ? mapCrmConfigRow(row)
    : {
        id: CRM_CONFIG_ID,
        ...CRM_CONFIG_DEFAULTS,
        configVersion: 1,
        updatedAt: new Date().toISOString(),
      };

  cache.config = config;
  cache.expiresAt = Date.now() + CACHE_TTL_MS;
  return config;
}

export function clearCrmConfigCache() {
  cache.config = null;
  cache.expiresAt = 0;
}

/**
 * @param {Record<string, unknown>} query
 * @param {{ insuranceExpiryDays: number; rcExpiryDays: number; fitnessExpiryDays: number }} config
 */
export function resolveCrmExpiryThresholds(query, config) {
  return {
    insuranceExpiryDays: parseThreshold(query, 'insuranceExpiryDays', config.insuranceExpiryDays),
    rcExpiryDays: parseThreshold(query, 'rcExpiryDays', config.rcExpiryDays),
    fitnessExpiryDays: parseThreshold(query, 'fitnessExpiryDays', config.fitnessExpiryDays),
  };
}

/**
 * @param {Record<string, unknown>} query
 * @param {string} key
 * @param {number} defaultValue
 */
export function parseThreshold(query, key, defaultValue) {
  const n = Number(query[key]);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.max(0, Math.floor(n));
}
