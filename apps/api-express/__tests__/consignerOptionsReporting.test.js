import { fetchConsignerOptions } from '../src/services/reporting/consignerReporting.js';

describe('fetchConsignerOptions mineral path', () => {
  it('uses consignerRowId as option id, not challan sourceRowId', async () => {
    const prisma = {
      reportConsigneeSummary: {
        findMany: async () => [
          {
            consignerRowId: 'consigner-abc',
            sourceRowId: 'challan-xyz',
            consignerName: 'Test Consigner',
            operatorType: 'lessee',
            dmoName: 'ARWAL',
            challanCount: 5,
            ghatNumber: null,
            lastScrapedAt: new Date('2024-01-01'),
          },
        ],
      },
    };

    const result = await fetchConsignerOptions(prisma, { mineral: 'STONE', reportScope: 'all' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('consigner-abc');
    expect(result.items[0].id).not.toBe('challan-xyz');
  });

  it('excludes consigners with only zero-pass lines when hideZeroPasses is set', async () => {
    const prisma = {
      reportConsigneeSummary: {
        findMany: async () => [
          {
            consignerRowId: 'consigner-zero',
            sourceRowId: 'challan-a',
            consignerName: 'Zero Only',
            operatorType: 'lessee',
            dmoName: 'ARWAL',
            challanCount: 0,
            ghatNumber: null,
            lastScrapedAt: new Date('2024-01-01'),
          },
          {
            consignerRowId: 'consigner-active',
            sourceRowId: 'challan-b',
            consignerName: 'Active',
            operatorType: 'lessee',
            dmoName: 'ARWAL',
            challanCount: 3,
            ghatNumber: null,
            lastScrapedAt: new Date('2024-01-01'),
          },
        ],
      },
    };

    const result = await fetchConsignerOptions(prisma, {
      mineral: 'STONE',
      reportScope: 'all',
      hideZeroPasses: '1',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('consigner-active');
  });
});
