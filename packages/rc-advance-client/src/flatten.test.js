import { describe, expect, it } from '@jest/globals';
import sample from '../fixtures/rc_advance_api_sample.json' with { type: 'json' };
import { flattenRcAdvanceResponse, flatKeysFromSample } from './flatten.js';
import { RC_ADVANCE_CRM_COLUMNS } from './columnsData.js';
import { fetchRcAdvanceMock, clearMockRcAdvanceCache } from './mockProvider.js';

describe('flattenRcAdvanceResponse', () => {
  it('flattens canonical sample with nested prefixes', () => {
    const flat = flattenRcAdvanceResponse(sample);
    expect(flat.status_code).toBe(100);
    expect(flat.owner_name).toBe('ANIL KUMAR');
    expect(flat.vehicle_status).toBe('ACTIVE');
    expect(flat.insurance_insurance_company_name).toContain('Bajaj');
    expect(flat.financer_financer_name).toBe('HDFC BANK LTD');
    expect(flatKeysFromSample(sample).length).toBeGreaterThan(90);
  });
});

describe('RC_ADVANCE_CRM_COLUMNS', () => {
  it('includes owner and insurance columns', () => {
    const keys = RC_ADVANCE_CRM_COLUMNS.map((c) => c.key);
    expect(keys).toContain('owner_name');
    expect(keys).toContain('insurance_insurance_upto');
  });
});

describe('fetchRcAdvanceMock', () => {
  it('loads generated mock file for known VRN', async () => {
    clearMockRcAdvanceCache();
    delete process.env.RC_ADVANCE_MOCK_FILE;
    const result = await fetchRcAdvanceMock('BR26GA3634');
    expect(result.success).toBe(true);
    expect(/** @type {{ result?: { reg_no?: string } }} */ (result.data)?.result?.reg_no).toBe(
      'BR26GA3634',
    );
  });
});
