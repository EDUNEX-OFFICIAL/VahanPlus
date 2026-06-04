import {
  analyzeImportPayload,
  stripBomFromHeaders,
  validateReportDate,
} from '../src/services/epassImport.js';

describe('stripBomFromHeaders', () => {
  it('removes UTF-8 BOM from first header', () => {
    expect(stripBomFromHeaders(['\uFEFFdmoName', 'Passes'])).toEqual(['dmoName', 'Passes']);
  });
});

describe('validateReportDate', () => {
  it('accepts valid ISO dates', () => {
    expect(validateReportDate('2026-06-01')).toBe('2026-06-01');
  });

  it('rejects invalid formats', () => {
    expect(() => validateReportDate('01-06-2026')).toThrow(/YYYY-MM-DD/);
    expect(() => validateReportDate('2026-13-40')).toThrow(/valid calendar date/);
  });
});

describe('analyzeImportPayload', () => {
  const districtHeaders = [
    'DMO Name',
    'Lessee Users',
    'Lessee Passes',
    'Dealer Users',
    'Dealer Passes',
  ];

  it('detects district snapshot when score >= 3', () => {
    const result = analyzeImportPayload(districtHeaders, [], { totalRowCount: 100 });
    expect(result.detectedType).toBe('district_snapshot');
    expect(result.mapping.dmoName).toBe('DMO Name');
    expect(result.rowCount).toBe(100);
    expect(result.errors).toHaveLength(0);
  });

  it('detects vehicle status when VRN column present', () => {
    const result = analyzeImportPayload(['VRN', 'Gross Weight'], [], { totalRowCount: 5 });
    expect(result.detectedType).toBe('vehicle_status');
    expect(result.mapping.vehicleRegNo).toBe('VRN');
  });

  it('warns when district and vehicle columns both match strongly', () => {
    const headers = [...districtHeaders, 'VRN', 'Gross Weight'];
    const result = analyzeImportPayload(headers, []);
    expect(result.detectedType).toBe('district_snapshot');
    expect(result.warnings.some((w) => /both district and vehicle/i.test(w))).toBe(true);
  });

  it('returns unrecognized for unknown format', () => {
    const result = analyzeImportPayload(['Foo', 'Bar'], []);
    expect(result.detectedType).toBeNull();
    expect(result.errors[0]).toMatch(/Unrecognized file format/);
  });

  it('strips BOM before mapping', () => {
    const result = analyzeImportPayload(['\uFEFFDMO Name', 'Lessee Users', 'Lessee Passes'], []);
    expect(result.detectedType).toBe('district_snapshot');
    expect(result.mapping.dmoName).toBe('\uFEFFDMO Name'.replace(/^\uFEFF/, ''));
  });
});
