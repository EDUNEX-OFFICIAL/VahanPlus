import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChallanPassTable } from '../src/challan-pass-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(__dirname, '../fixtures/challan-pass-detail-sample.html');
const html = readFileSync(fixture, 'utf8');
const report = parseChallanPassTable(html, 'https://example.test/detail');

if (report.rowCount !== 2) {
  console.error(`Expected 2 rows, got ${report.rowCount}`);
  process.exit(1);
}

const [a, b] = report.rows;
if (a.challanNo !== '330021260520101946683' || b.challanNo !== '330021260520102704787') {
  console.error('Unexpected challan numbers', a.challanNo, b.challanNo);
  process.exit(1);
}

if (a.vehicleRegNo !== 'BR01GN8970' || a.checkStatus !== 'DESPATCHED') {
  console.error('Unexpected pass fields', a);
  process.exit(1);
}

const qtySum = a.quantity + b.quantity;
if (Math.abs(qtySum - 78.72) > 0.01) {
  console.error(`Expected qty sum ~78.72, got ${qtySum}`);
  process.exit(1);
}

console.log('challan-pass-parser fixture OK');
