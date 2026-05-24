import type { FetchOptions } from '../types.js';
import { getPortalHttpConfig } from './config.js';

function overridesFromMetadata(metadata?: Record<string, unknown>) {
  const http = metadata?.__http as Record<string, unknown> | undefined;
  if (!http) return null;
  return {
    postDelayMs:
      typeof http.postDelayMs === 'number' && Number.isFinite(http.postDelayMs)
        ? http.postDelayMs
        : undefined,
    timeoutMs:
      typeof http.timeoutMs === 'number' && Number.isFinite(http.timeoutMs)
        ? http.timeoutMs
        : undefined,
    retries:
      typeof http.retries === 'number' && Number.isFinite(http.retries)
        ? http.retries
        : undefined,
  };
}

export function fetchOptionsFromMetadata(metadata?: Record<string, unknown>): FetchOptions {
  const env = getPortalHttpConfig();
  const overrides = overridesFromMetadata(metadata);
  return {
    date: typeof metadata?.date === 'string' ? metadata.date : undefined,
    timeoutMs:
      overrides?.timeoutMs ??
      (typeof metadata?.timeoutMs === 'number' && Number.isFinite(metadata.timeoutMs)
        ? metadata.timeoutMs
        : env.timeoutMs),
    retries:
      overrides?.retries ??
      (typeof metadata?.retries === 'number' && Number.isFinite(metadata.retries)
        ? metadata.retries
        : env.retries),
    postDelayMs:
      overrides?.postDelayMs ??
      (typeof metadata?.postDelayMs === 'number' && Number.isFinite(metadata.postDelayMs)
        ? metadata.postDelayMs
        : env.postDelayMs),
  };
}
