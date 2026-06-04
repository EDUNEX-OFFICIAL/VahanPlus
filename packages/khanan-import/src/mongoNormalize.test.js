import { describe, expect, it } from '@jest/globals';
import { detectBulkFormat, normalizeKhananMongoRecord } from './mongoNormalize.js';

describe('normalizeKhananMongoRecord', () => {
  it('maps sample mongo export fields', () => {
    const m = normalizeKhananMongoRecord({
      district: 'Patna',
      consignerName: 'ACME',
      date: '22-Jun-2019',
      challanNo: 'CH-1',
      vehicleRegNo: 'BR01AB1234',
      _id: 'ignored',
    });
    expect(m).toMatchObject({
      district: 'Patna',
      consignerName: 'ACME',
      challanNo: 'CH-1',
      vehicleRegNo: 'BR01AB1234',
    });
  });

  it('returns null without required keys', () => {
    expect(normalizeKhananMongoRecord({ district: 'X' })).toBeNull();
  });
});

describe('detectBulkFormat', () => {
  it('detects ndjson extensions', () => {
    expect(detectBulkFormat('data.jsonl')).toBe('ndjson');
    expect(detectBulkFormat('data.ndjson')).toBe('ndjson');
    expect(detectBulkFormat('data.json')).toBe('json_array');
  });
});
