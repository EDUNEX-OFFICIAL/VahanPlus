export {
  RESULT_SCALAR_KEYS,
  RESULT_NESTED_PREFIXES,
  TOP_LEVEL_FLAT_KEYS,
  RESULT_STATUS_FLAT_KEY,
  RC_ADVANCE_FETCH_TTL_MS,
  DEFAULT_RC_ADVANCE_MOCK_FILE,
} from './schema.js';
export { flattenRcAdvanceResponse, flatKeysFromSample } from './flatten.js';
export {
  buildRcAdvanceCrmColumns,
  getRcAdvanceCrmColumns,
  setRcAdvanceCrmColumnsCache,
  rcAdvanceColumnLabel,
} from './columns.js';
export {
  loadMockRcAdvanceMap,
  clearMockRcAdvanceCache,
  fetchRcAdvanceMock,
} from './mockProvider.js';
export { fetchRcAdvanceHttp } from './httpProvider.js';
export { fetchRcAdvance, rcAdvanceSourceLabel } from './resolveProvider.js';
export { persistRcAdvanceFetch, persistRcAdvanceRaw } from './persist.js';
export { RC_ADVANCE_CRM_COLUMNS } from './columnsData.js';
