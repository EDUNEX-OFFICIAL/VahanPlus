import assert from 'node:assert/strict';
import {
  eachIsoDayInclusive,
  isoToPortalDate,
  parseIsoDate,
} from '../src/date-format.js';

assert.equal(isoToPortalDate('2026-05-20'), '20/05/2026');
assert.deepEqual(eachIsoDayInclusive('2026-05-01', '2026-05-03'), [
  '2026-05-01',
  '2026-05-02',
  '2026-05-03',
]);
assert.equal(parseIsoDate('2026-05-20')?.getDate(), 20);

console.log('date-format.test.ts: ok');
