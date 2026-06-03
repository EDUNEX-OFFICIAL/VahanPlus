/** Keep in sync with packages/khanan-config/src/defaults.js SPEED_PRESETS */
export const SCRAPER_SPEED_PRESETS = {
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
} as const;

export type ScraperSpeedPresetName = keyof typeof SCRAPER_SPEED_PRESETS;
