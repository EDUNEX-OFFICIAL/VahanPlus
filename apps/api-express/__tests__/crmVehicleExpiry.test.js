import { mergeRcAdvanceIntoCrmItems } from '../src/services/rcAdvanceEnrichment.js';

describe('mergeRcAdvanceIntoCrmItems', () => {
  it('merges flat RC Advance fields onto CRM rows', () => {
    const items = [
      {
        vehicleRegNo: 'BR01AB1234',
        insuranceDaysLeft: 10,
      },
    ];
    const rcByVrn = new Map([
      [
        'BR01AB1234',
        {
          flat: { owner_name: 'TEST OWNER', mobile_no: 9999999999 },
          fetchedAt: '2026-06-05T00:00:00.000Z',
          message: 'Vehicle Found',
          error: null,
        },
      ],
    ]);

    const merged = mergeRcAdvanceIntoCrmItems(items, rcByVrn);
    expect(merged[0].rcAdvance?.owner_name).toBe('TEST OWNER');
    expect(merged[0].rcAdvanceFetchedAt).toBe('2026-06-05T00:00:00.000Z');
    expect(merged[0].rcAdvanceMessage).toBe('Vehicle Found');
  });
});

describe('crm vehicle expiry RC merge contract', () => {
  it('keeps portal fields when RC data is missing', () => {
    const merged = mergeRcAdvanceIntoCrmItems(
      [{ vehicleRegNo: 'BR01ZZ9999', insuranceDaysLeft: 5 }],
      new Map(),
    );
    expect(merged[0].insuranceDaysLeft).toBe(5);
    expect(merged[0].rcAdvance).toBeNull();
  });
});
