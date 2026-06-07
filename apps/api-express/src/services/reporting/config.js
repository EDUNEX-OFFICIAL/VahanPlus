/** When true, dashboard reporting reads CQRS summary tables only. */
export function isReportingReadModelEnabled() {
  const raw = process.env.REPORTING_READ_MODEL;
  if (raw === 'false' || raw === '0') return false;
  return true;
}

export const REPORTING_SHADOW_COMPARE = process.env.REPORTING_SHADOW_COMPARE === 'true';
