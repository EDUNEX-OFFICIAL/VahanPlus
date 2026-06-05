import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeVehicleRegNo } from '@vahanplus/scraper-bihar-epass';
import { DEFAULT_RC_ADVANCE_MOCK_FILE } from './schema.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Map<string, Record<string, unknown>> | null} */
let cache = null;
/** @type {Promise<Map<string, Record<string, unknown>>> | null} */
let loadPromise = null;

/**
 * @param {string} [filePath]
 */
function resolveMockFilePath(filePath) {
  const configured = filePath || process.env.RC_ADVANCE_MOCK_FILE || DEFAULT_RC_ADVANCE_MOCK_FILE;
  if (path.isAbsolute(configured)) return configured;
  const repoRoot = path.resolve(packageRoot, '../..');
  return path.resolve(repoRoot, configured);
}

/**
 * @param {string} [filePath]
 */
export async function loadMockRcAdvanceMap(filePath) {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const resolved = resolveMockFilePath(filePath);
    const raw = await readFile(resolved, 'utf8');
    const parsed = JSON.parse(raw);
    /** @type {Map<string, Record<string, unknown>>} */
    const map = new Map();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [vrn, response] of Object.entries(parsed)) {
        const normalized = normalizeVehicleRegNo(vrn);
        if (normalized && response && typeof response === 'object') {
          map.set(normalized, /** @type {Record<string, unknown>} */ (response));
        }
      }
    }
    cache = map;
    return map;
  })();

  return loadPromise;
}

export function clearMockRcAdvanceCache() {
  cache = null;
  loadPromise = null;
}

/**
 * @param {string} vehicleRegNo
 * @param {string} [filePath]
 */
export async function fetchRcAdvanceMock(vehicleRegNo, filePath) {
  const normalized = normalizeVehicleRegNo(vehicleRegNo);
  if (!normalized) {
    return {
      success: false,
      error: 'Invalid vehicleRegNo',
      data: null,
    };
  }

  const map = await loadMockRcAdvanceMap(filePath);
  const data = map.get(normalized);
  if (!data) {
    return {
      success: false,
      error: 'Vehicle not found in mock dataset',
      data: {
        status_code: 404,
        status: '0',
        message: 'Vehicle Not Found',
        txn_id: null,
        response_type: 'FULL_DATA',
        metadata: { billable: false },
        result: null,
      },
    };
  }

  return { success: true, data, error: null };
}
