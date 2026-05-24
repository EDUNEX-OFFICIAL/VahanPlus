/** Read portal HTTP tuning from environment (works in worker and scripts). */
export function getPortalHttpConfig() {
  const postDelayMs = Number(process.env.BIHAR_PORTAL_POST_DELAY_MS ?? '1000');
  const timeoutMs = Number(process.env.BIHAR_FETCH_TIMEOUT_MS ?? '30000');
  const retries = Number(process.env.BIHAR_FETCH_RETRIES ?? '3');

  return {
    postDelayMs: Number.isFinite(postDelayMs) && postDelayMs >= 0 ? postDelayMs : 1000,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000,
    retries: Number.isFinite(retries) && retries >= 0 ? Math.floor(retries) : 3,
  };
}
