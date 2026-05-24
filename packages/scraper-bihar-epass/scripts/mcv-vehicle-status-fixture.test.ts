import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMcvVehicleStatusTable } from '../src/mcv-vehicle-status-parser.js';
import { MCV_VEHICLE_STATUS_URL } from '../src/mcv-urls.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(__dirname, '../fixtures/mcv-vehicle-status-sample.html');
const html = readFileSync(fixture, 'utf8');
const report = parseMcvVehicleStatusTable(html, MCV_VEHICLE_STATUS_URL, 'BR01GN8970');

if (!report.found || !report.row) {
  console.error('Expected found vehicle row', report);
  process.exit(1);
}

const row = report.row;
if (row.ksRegNo !== 'KS-198047' || row.vehicleRegNo !== 'BR01GN8970') {
  console.error('Unexpected identifiers', row);
  process.exit(1);
}

if (row.vehicleClass !== 'Goods Carrier(HGV)' || row.imeiNo !== 'IMEI Tagged') {
  console.error('Unexpected vehicle fields', row);
  process.exit(1);
}

if (row.grossWeightMt !== 55 || row.unladenWeightMt !== 15.5) {
  console.error('Unexpected weights', row);
  process.exit(1);
}

console.log('mcv-vehicle-status-parser fixture OK');
