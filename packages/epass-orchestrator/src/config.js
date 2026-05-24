import { loadKhananConfig, rateLimiterFromConfig } from '@vahanplus/khanan-config';

let detailDelayWarned = false;

function warnDeprecatedDetailDelay() {
  if (detailDelayWarned) return;
  if (process.env.BIHAR_EPASS_DETAIL_DELAY_MS && !process.env.BIHAR_FANOUT_STAGGER_MS) {
    console.warn(
      '[epass-orchestrator] BIHAR_EPASS_DETAIL_DELAY_MS is deprecated for fanout; use Khanan Config UI or BIHAR_FANOUT_STAGGER_MS.',
    );
    detailDelayWarned = true;
  }
}

/**
 * @param {import('@vahanplus/db').PrismaClient} [prisma]
 */
export async function getOrchestratorConfig(prisma) {
  warnDeprecatedDetailDelay();

  if (prisma) {
    const cfg = await loadKhananConfig(prisma);
    return {
      skipChallan: cfg.skipChallan,
      skipChallanPass: cfg.skipChallanPass,
      skipVehicleStatus: cfg.skipVehicleStatus,
      maxConsignerJobs:
        cfg.maxConsignerJobs != null && cfg.maxConsignerJobs > 0
          ? cfg.maxConsignerJobs
          : undefined,
      fanoutStaggerMs: cfg.fanoutStaggerMs,
      mcvVehicleStatusUrl:
        process.env.BIHAR_MCV_VEHICLE_STATUS_URL ??
        'https://khanansoft.bihar.gov.in/portal/MCVReports/MCVReportWiseStatus.aspx',
    };
  }

  const fanoutStaggerMs = Number(
    process.env.BIHAR_FANOUT_STAGGER_MS ??
      process.env.BIHAR_EPASS_DETAIL_DELAY_MS ??
      '0',
  );

  return {
    skipChallan: process.env.BIHAR_EPASS_SKIP_CHALLAN === 'true',
    skipChallanPass: process.env.BIHAR_EPASS_SKIP_CHALLAN_PASS === 'true',
    skipVehicleStatus: process.env.BIHAR_EPASS_SKIP_VEHICLE_STATUS === 'true',
    maxConsignerJobs: process.env.BIHAR_EPASS_MAX_CONSIGNER_JOBS
      ? Number(process.env.BIHAR_EPASS_MAX_CONSIGNER_JOBS)
      : undefined,
    fanoutStaggerMs: Number.isFinite(fanoutStaggerMs) && fanoutStaggerMs >= 0 ? fanoutStaggerMs : 0,
    mcvVehicleStatusUrl:
      process.env.BIHAR_MCV_VEHICLE_STATUS_URL ??
      'https://khanansoft.bihar.gov.in/portal/MCVReports/MCVReportWiseStatus.aspx',
  };
}

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 2000 },
  removeOnFail: { count: 500 },
};

/**
 * @param {import('@vahanplus/db').PrismaClient} [prisma]
 */
export async function getRateLimiterOptions(prisma) {
  if (prisma) {
    const cfg = await loadKhananConfig(prisma);
    return rateLimiterFromConfig(cfg);
  }
  const max = Number(process.env.BIHAR_PORTAL_RATE_LIMIT_MAX ?? '2');
  const duration = Number(process.env.BIHAR_PORTAL_RATE_LIMIT_DURATION_MS ?? '1000');
  return {
    max: Number.isFinite(max) && max > 0 ? max : 2,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 1000,
  };
}
