import {
  applyConsignerNameFilter,
  consignerNameContainsWhere,
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
  it('preserves spaces before parentheses', () => {
    expect(
      normalizeConsignerFilterQuery('BANSHIDHAR CONSTRUCTION PVT LTD (Arwal Son-06(Rampur Waina))'),
    ).toBe('BANSHIDHAR CONSTRUCTION PVT LTD (Arwal Son-06(Rampur Waina))');
  });

  it('strips district/role prefix and trailing row count from option labels', () => {
    expect(
      normalizeConsignerFilterQuery(
        'ARWAL - lessee - BANSHIDHAR CONSTRUCTION PVT LTD(Arwal Son-06(Rampur Waina))-023212000801 (65)',
      ),
    ).toBe('BANSHIDHAR CONSTRUCTION PVT LTD(Arwal Son-06(Rampur Waina))-023212000801');
  });

  it('preserves MAA VAISHANVI screenshot consigner name spacing', () => {
    expect(
      normalizeConsignerFilterQuery(
        'MAA VAISHANVI ENTERPRISES (KINJAR AND MIRZAPUR)- 023069248301',
      ),
    ).toBe('MAA VAISHANVI ENTERPRISES (KINJAR AND MIRZAPUR)- 023069248301');
  });
});

describe('consignerNameContainsWhere', () => {
  it('returns OR with spaced and compact variants when they differ', () => {
    const clause = consignerNameContainsWhere(
      'MAA VAISHANVI ENTERPRISES (KINJAR AND MIRZAPUR)- 023069248301',
    );
    expect(clause.OR).toHaveLength(2);
    expect(clause.OR[0].consignerName.contains).toBe(
      'MAA VAISHANVI ENTERPRISES (KINJAR AND MIRZAPUR)- 023069248301',
    );
    expect(clause.OR[1].consignerName.contains).toBe(
      'MAA VAISHANVI ENTERPRISES(KINJAR AND MIRZAPUR)- 023069248301',
    );
  });

  it('returns single contains when input is already compact', () => {
    const clause = consignerNameContainsWhere('BANSHIDHAR CONSTRUCTION PVT LTD(Arwal)');
    expect(clause.consignerName).toEqual({
      contains: 'BANSHIDHAR CONSTRUCTION PVT LTD(Arwal)',
      mode: 'insensitive',
    });
  });

  it('returns null for empty input', () => {
    expect(consignerNameContainsWhere('')).toBeNull();
  });
});

describe('applyConsignerNameFilter', () => {
  it('merges OR clause into AND when variants differ', () => {
    const where = { snapshotId: 'snap-1' };
    applyConsignerNameFilter(
      where,
      'MAA VAISHANVI ENTERPRISES (KINJAR AND MIRZAPUR)- 023069248301',
    );
    expect(where.snapshotId).toBe('snap-1');
    expect(where.AND).toHaveLength(1);
    expect(where.AND[0].OR).toHaveLength(2);
  });
});
