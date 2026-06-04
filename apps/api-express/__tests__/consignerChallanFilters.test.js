import { buildConsignerChallansWhere } from '../src/services/consignerChallanFilters.js';

describe('buildConsignerChallansWhere', () => {
  const ids = ['c1', 'c2'];

  it('scopes to consigner row ids', () => {
    const where = buildConsignerChallansWhere(ids, {});
    expect(where).toEqual({ consignerRowId: { in: ids } });
  });

  it('filters by consignee name', () => {
    const where = buildConsignerChallansWhere(ids, { consignee: 'Acme' });
    expect(where.consigneeName).toEqual({ contains: 'Acme', mode: 'insensitive' });
  });

  it('strips id suffix from consignee filter labels', () => {
    const where = buildConsignerChallansWhere(ids, {
      consignee: 'MS RUHI ENTERPRISES | (0232790301)',
    });
    expect(where.consigneeName).toEqual({ contains: 'MS RUHI ENTERPRISES', mode: 'insensitive' });
  });

  it('filters challans with passes matching destination', () => {
    const where = buildConsignerChallansWhere(ids, { destination: 'Patna' });
    expect(where.passes).toEqual({
      some: { destination: { contains: 'Patna', mode: 'insensitive' } },
    });
  });

  it('combines hideZeroPasses and destination', () => {
    const where = buildConsignerChallansWhere(ids, {
      hideZeroPasses: '1',
      destination: ' Gaya ',
    });
    expect(where.challanCount).toEqual({ gt: 0 });
    expect(where.passes.some.destination.contains).toBe('Gaya');
  });
});
