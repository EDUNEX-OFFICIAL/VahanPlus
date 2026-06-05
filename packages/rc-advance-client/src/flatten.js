import {
  RESULT_NESTED_PREFIXES,
  RESULT_SCALAR_KEYS,
  RESULT_STATUS_FLAT_KEY,
  TOP_LEVEL_FLAT_KEYS,
} from './schema.js';

/**
 * @param {unknown} value
 * @returns {string | number | boolean | null}
 */
function toFlatScalar(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  return String(value);
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @param {Record<string, string | number | boolean | null>} out
 */
function flattenNestedObject(obj, prefix, out) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const [key, value] of Object.entries(obj)) {
    if (value != null && typeof value === 'object' && !Array.isArray(value)) continue;
    out[`${prefix}${key}`] = toFlatScalar(value);
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {Record<string, string | number | boolean | null>}
 */
export function flattenRcAdvanceResponse(raw) {
  /** @type {Record<string, string | number | boolean | null>} */
  const flat = {};

  if (!raw || typeof raw !== 'object') {
    for (const key of TOP_LEVEL_FLAT_KEYS) flat[key] = null;
    return flat;
  }

  flat.status_code = toFlatScalar(raw.status_code);
  flat.status = toFlatScalar(raw.status);
  flat.message = toFlatScalar(raw.message);
  flat.txn_id = toFlatScalar(raw.txn_id);
  flat.response_type = toFlatScalar(raw.response_type);
  flat.billable =
    raw.metadata && typeof raw.metadata === 'object' && 'billable' in raw.metadata
      ? toFlatScalar(/** @type {Record<string, unknown>} */ (raw.metadata).billable)
      : null;

  const result = raw.result && typeof raw.result === 'object' ? raw.result : null;
  if (!result) {
    for (const key of RESULT_SCALAR_KEYS) {
      if (key === 'status') flat[RESULT_STATUS_FLAT_KEY] = null;
      else flat[key] = null;
    }
    return flat;
  }

  for (const key of RESULT_SCALAR_KEYS) {
    if (key === 'status') {
      flat[RESULT_STATUS_FLAT_KEY] = toFlatScalar(result.status);
    } else {
      flat[key] = toFlatScalar(result[key]);
    }
  }

  for (const [nestedKey, prefix] of Object.entries(RESULT_NESTED_PREFIXES)) {
    flattenNestedObject(/** @type {Record<string, unknown>} */ (result[nestedKey]), prefix, flat);
  }

  return flat;
}

/**
 * @param {Record<string, unknown>} sampleResponse
 * @returns {string[]}
 */
export function flatKeysFromSample(sampleResponse) {
  return Object.keys(flattenRcAdvanceResponse(sampleResponse));
}
