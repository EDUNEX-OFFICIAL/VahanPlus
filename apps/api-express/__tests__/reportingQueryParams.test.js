import { parseCsvQueryParam } from '../src/services/reporting/queryParams.js';

describe('parseCsvQueryParam', () => {
  it('reads canonical mineral and district params', () => {
    expect(parseCsvQueryParam({ mineral: 'STONE,SAND' }, 'mineral', 'minerals')).toEqual([
      'STONE',
      'SAND',
    ]);
    expect(parseCsvQueryParam({ district: 'ARWAL,AURANGABAD' }, 'district', 'districts')).toEqual([
      'ARWAL',
      'AURANGABAD',
    ]);
  });

  it('falls back to legacy minerals/districts keys', () => {
    expect(parseCsvQueryParam({ minerals: 'STONE' }, 'mineral', 'minerals')).toEqual(['STONE']);
    expect(parseCsvQueryParam({ districts: 'PATNA' }, 'district', 'districts', 'dmo')).toEqual([
      'PATNA',
    ]);
  });
});
