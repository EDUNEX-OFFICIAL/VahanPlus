import { analyzeImportPayload } from '../src/services/epassImport.js';
import {
  buildKhananPassAnalyzeStats,
  buildKhananPassMapping,
  mapSourceTypeToOperator,
} from '../src/services/khananPassImport.js';
import { parsePortalReportDate } from '@vahanplus/scraper-bihar-epass';

const KHANAN_HEADERS = [
  'district',
  'consignerName',
  'date',
  'sourceType',
  'consigneeName',
  'challanNo',
  'mineralName',
  'mineralCategory',
  'vehicleRegNo',
  'destination',
  'transportedDate',
  'quantity',
  'unit',
  'checkStatus',
];

describe('parsePortalReportDate', () => {
  it('parses dd-MMM-yyyy to ISO', () => {
    expect(parsePortalReportDate('22-Jun-2019')).toBe('2019-06-22');
    expect(parsePortalReportDate('06-Aug-2025')).toBe('2025-08-06');
  });

  it('accepts ISO input', () => {
    expect(parsePortalReportDate('2025-03-21')).toBe('2025-03-21');
  });

  it('returns null for invalid dates', () => {
    expect(parsePortalReportDate('not-a-date')).toBeNull();
    expect(parsePortalReportDate('')).toBeNull();
  });
});

describe('mapSourceTypeToOperator', () => {
  it('maps Lessee and Dealer case-insensitively', () => {
    expect(mapSourceTypeToOperator('Lessee')).toBe('lessee');
    expect(mapSourceTypeToOperator('DEALER')).toBe('dealer');
    expect(mapSourceTypeToOperator(undefined)).toBe('lessee');
  });
});

describe('buildKhananPassMapping', () => {
  it('maps sample export headers', () => {
    const { mapping, errors } = buildKhananPassMapping(
      KHANAN_HEADERS,
      {
        district: ['district'],
        consignerName: ['consignername'],
        date: ['date'],
        challanNo: ['challanno'],
        vehicleRegNo: ['vehicleregno'],
      },
      ['vehicleRegNo', 'district', 'consignerName', 'challanNo', 'date'],
    );
    expect(errors).toHaveLength(0);
    expect(mapping.district).toBe('district');
    expect(mapping.vehicleRegNo).toBe('vehicleRegNo');
  });
});

describe('analyzeImportPayload khanan_pass', () => {
  it('detects khanan_pass from sample headers', () => {
    const result = analyzeImportPayload(KHANAN_HEADERS, [], { totalRowCount: 5000 });
    expect(result.detectedType).toBe('khanan_pass');
    expect(result.mapping.district).toBe('district');
    expect(result.mapping.challanNo).toBe('challanNo');
    expect(result.errors).toHaveLength(0);
  });

  it('prefers khanan_pass over vehicle_status when VRN and pass columns exist', () => {
    const headers = [...KHANAN_HEADERS, 'Gross Weight', 'Fitness'];
    const result = analyzeImportPayload(headers, []);
    expect(result.detectedType).toBe('khanan_pass');
  });

  it('computes distinct dates and VRNs from statsRows', () => {
    const statsRows = [
      {
        district: 'A',
        consignerName: 'C1',
        date: '22-Jun-2019',
        challanNo: '1',
        vehicleRegNo: 'BR01',
      },
      {
        district: 'B',
        consignerName: 'C2',
        date: '06-Aug-2025',
        challanNo: '2',
        vehicleRegNo: 'BR01',
      },
    ];
    const result = analyzeImportPayload(KHANAN_HEADERS, [], {
      totalRowCount: 2,
      statsRows,
    });
    expect(result.distinctDates?.count).toBe(2);
    expect(result.distinctVrns).toBe(1);
  });
});

describe('buildKhananPassAnalyzeStats', () => {
  it('warns on unparseable dates', () => {
    const mapping = {
      district: 'district',
      consignerName: 'consignerName',
      date: 'date',
      challanNo: 'challanNo',
      vehicleRegNo: 'vehicleRegNo',
    };
    const stats = buildKhananPassAnalyzeStats(
      [
        {
          district: 'X',
          consignerName: 'Y',
          date: 'bad',
          challanNo: '1',
          vehicleRegNo: 'BR99',
        },
      ],
      mapping,
    );
    expect(stats.warnings.some((w) => /unparseable date/i.test(w))).toBe(true);
  });
});
