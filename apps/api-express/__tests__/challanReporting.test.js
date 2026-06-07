import { buildPassWhere } from '../src/services/reporting/challanReporting.js';

describe('buildPassWhere', () => {
  it('filters challanNo from query.challan (web param)', () => {
    expect(buildPassWhere({ challan: '333091260605123128847' })).toEqual({
      challanNo: { contains: '333091260605123128847', mode: 'insensitive' },
    });
  });

  it('filters challanNo from query.challanNo (legacy param)', () => {
    expect(buildPassWhere({ challanNo: 'CH-123' })).toEqual({
      challanNo: { contains: 'CH-123', mode: 'insensitive' },
    });
  });

  it('prefers query.challan over query.challanNo when both set', () => {
    expect(buildPassWhere({ challan: 'A', challanNo: 'B' })).toEqual({
      challanNo: { contains: 'A', mode: 'insensitive' },
    });
  });

  it('filters vehicleRegNo from query.vehicle', () => {
    expect(buildPassWhere({ vehicle: 'BR26GC5753' })).toEqual({
      vehicleRegNo: { contains: 'BR26GC5753', mode: 'insensitive' },
    });
  });

  it('does not treat VRN as challan when only vehicle param is set', () => {
    const where = buildPassWhere({ vehicle: 'BR26GC5753' });
    expect(where.challanNo).toBeUndefined();
    expect(where.vehicleRegNo).toBeDefined();
  });

  it('ignores whitespace-only challan and vehicle values', () => {
    expect(buildPassWhere({ challan: '   ', vehicle: '  ' })).toEqual({});
  });

  it('filters vehicleRegNo from query.vehicleRegNo legacy alias', () => {
    expect(buildPassWhere({ vehicleRegNo: 'BR01GN8970' })).toEqual({
      vehicleRegNo: { contains: 'BR01GN8970', mode: 'insensitive' },
    });
  });

  it('prefers query.vehicle over query.vehicleRegNo when both set', () => {
    expect(buildPassWhere({ vehicle: 'A', vehicleRegNo: 'B' })).toEqual({
      vehicleRegNo: { contains: 'A', mode: 'insensitive' },
    });
  });
});
