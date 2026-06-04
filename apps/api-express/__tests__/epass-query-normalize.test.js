import {
  normalizeConsigneeFilterQuery,
  normalizeConsignerFilterQuery,
} from '../src/lib/epass-query-normalize.js';

describe('normalizeConsigneeFilterQuery', () => {
  it('strips portal id suffix from summary consignee labels', () => {
    expect(normalizeConsigneeFilterQuery('MS RUHI ENTERPRISES | (0232790301)')).toBe(
      'MS RUHI ENTERPRISES',
    );
  });

  it('leaves plain names unchanged', () => {
    expect(normalizeConsigneeFilterQuery('MS RUHI ENTERPRISES')).toBe('MS RUHI ENTERPRISES');
  });
});

describe('normalizeConsignerFilterQuery', () => {
  it('removes spaces before parentheses', () => {
    expect(
      normalizeConsignerFilterQuery('BANSHIDHAR CONSTRUCTION PVT LTD (Arwal Son-06(Rampur Waina))'),
    ).toBe('BANSHIDHAR CONSTRUCTION PVT LTD(Arwal Son-06(Rampur Waina))');
  });

  it('strips district/role prefix and trailing row count from option labels', () => {
    expect(
      normalizeConsignerFilterQuery(
        'ARWAL - lessee - BANSHIDHAR CONSTRUCTION PVT LTD(Arwal Son-06(Rampur Waina))-023212000801 (65)',
      ),
    ).toBe('BANSHIDHAR CONSTRUCTION PVT LTD(Arwal Son-06(Rampur Waina))-023212000801');
  });
});
