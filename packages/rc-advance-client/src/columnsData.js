import sample from '../fixtures/rc_advance_api_sample.json' with { type: 'json' };
import { buildRcAdvanceCrmColumns, setRcAdvanceCrmColumnsCache } from './columns.js';

export const RC_ADVANCE_CRM_COLUMNS = buildRcAdvanceCrmColumns(
  /** @type {Record<string, unknown>} */ (sample),
);

setRcAdvanceCrmColumnsCache(RC_ADVANCE_CRM_COLUMNS);
