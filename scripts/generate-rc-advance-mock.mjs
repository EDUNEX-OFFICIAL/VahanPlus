#!/usr/bin/env node
/**
 * Generate docs/rc_advance_mock_by_vrn.json from khanan_sample_5000.json VRNs.
 * Usage: node scripts/generate-rc-advance-mock.mjs [--out path]
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FIRST_NAMES = [
  'ANIL',
  'RAJESH',
  'SUNIL',
  'AMIT',
  'VIKASH',
  'SANTOSH',
  'MANOJ',
  'RAVI',
  'DEEPAK',
  'SANJAY',
];
const LAST_NAMES = [
  'KUMAR',
  'SINGH',
  'YADAV',
  'PRASAD',
  'SHARMA',
  'VERMA',
  'GUPTA',
  'RAI',
  'THAKUR',
  'MISHRA',
];
const FATHER_NAMES = [
  'RADHA MOHAN PRASAD',
  'RAM NARESH SINGH',
  'SHIV SHANKAR YADAV',
  'LAL BAHADUR SHARMA',
  'JAGDISH PRASAD',
];
const MANUFACTURERS = ['TATA MOTORS LTD', 'ASHOK LEYLAND', 'EICHER MOTORS', 'BHARATBENZ'];
const FINANCERS = ['HDFC BANK LTD', 'ICICI BANK LTD', 'STATE BANK OF INDIA', 'AXIS BANK LTD'];
const INSURERS = [
  'Bajaj Allianz General Insurance Co. Ltd.',
  'ICICI Lombard General Insurance Co. Ltd.',
  'New India Assurance Co. Ltd.',
  'National Insurance Co. Ltd.',
];

/**
 * @param {string} seed
 */
function hashSeed(seed) {
  return createHash('sha256').update(seed).digest('hex');
}

/**
 * @param {string} seed
 * @param {number} max
 */
function pickIndex(seed, max) {
  const hex = hashSeed(seed);
  return parseInt(hex.slice(0, 8), 16) % max;
}

/**
 * @param {string} vrn
 * @param {number} daysFromNow
 */
function isoDateDaysFromNow(vrn, daysFromNow) {
  const base = new Date('2026-06-05T12:00:00.000Z');
  base.setUTCDate(base.getUTCDate() + daysFromNow);
  return base.toISOString().slice(0, 10);
}

/**
 * @param {string} vrn
 */
function deriveState(vrn) {
  if (vrn.startsWith('BR')) return { state_code: 'BR', state: 'Bihar', office_name: 'PATNA' };
  if (vrn.startsWith('AP')) return { state_code: 'AP', state: 'Andhra Pradesh', office_name: 'HYDERABAD' };
  if (vrn.startsWith('AS')) return { state_code: 'AS', state: 'Assam', office_name: 'GUWAHATI' };
  if (vrn.startsWith('UP')) return { state_code: 'UP', state: 'Uttar Pradesh', office_name: 'LUCKNOW' };
  return { state_code: 'XX', state: 'Unknown', office_name: 'REGIONAL' };
}

/**
 * @param {string} vrn
 * @param {Record<string, unknown>} template
 */
function buildResponseForVrn(vrn, template) {
  const response = structuredClone(template);
  const idx = pickIndex(vrn, 1000);
  const inExpiryWindow = idx < 180;
  const regDays = inExpiryWindow ? pickIndex(`${vrn}:reg`, 25) + 1 : pickIndex(`${vrn}:reg`, 400) + 60;
  const fitDays = inExpiryWindow ? pickIndex(`${vrn}:fit`, 28) + 2 : pickIndex(`${vrn}:fit`, 500) + 90;
  const taxDays = inExpiryWindow ? pickIndex(`${vrn}:tax`, 20) + 3 : pickIndex(`${vrn}:tax`, 450) + 75;
  const insDays = inExpiryWindow ? pickIndex(`${vrn}:ins`, 22) + 4 : pickIndex(`${vrn}:ins`, 420) + 80;

  const ownerName = `${FIRST_NAMES[pickIndex(`${vrn}:fn`, FIRST_NAMES.length)]} ${LAST_NAMES[pickIndex(`${vrn}:ln`, LAST_NAMES.length)]}`;
  const geo = deriveState(vrn);
  const mobile = 9000000000 + (pickIndex(`${vrn}:mob`, 900000000) % 900000000);

  response.txn_id = hashSeed(`${vrn}:txn`).slice(0, 8) + '-' + hashSeed(`${vrn}:txn2`).slice(0, 27);
  response.result = structuredClone(/** @type {Record<string, unknown>} */ (template.result));
  const result = /** @type {Record<string, unknown>} */ (response.result);

  result.state_code = geo.state_code;
  result.state = geo.state;
  result.office_name = geo.office_name;
  result.reg_no = vrn;
  result.owner_name = ownerName;
  result.owner_father_name = FATHER_NAMES[pickIndex(`${vrn}:father`, FATHER_NAMES.length)];
  result.current_full_address = `${ownerName}, ${geo.state}-841410`;
  result.permanent_full_address = result.current_full_address;
  result.current_pincode = 841410;
  result.permanent_pincode = 841410;
  result.chassis_no = `MAT${hashSeed(`${vrn}:ch`).slice(0, 11).toUpperCase()}`;
  result.engine_no = hashSeed(`${vrn}:en`).slice(0, 11).toUpperCase();
  result.vehicle_manufacturer_name = MANUFACTURERS[pickIndex(`${vrn}:mfg`, MANUFACTURERS.length)];
  result.model = `TRUCK MODEL ${pickIndex(`${vrn}:model`, 900) + 100}`;
  result.reg_upto = isoDateDaysFromNow(vrn, regDays);
  result.fit_upto = isoDateDaysFromNow(vrn, fitDays);
  result.tax_upto = isoDateDaysFromNow(vrn, taxDays);
  result.mobile_no = mobile;
  result.reg_date = isoDateDaysFromNow(vrn, -365 - pickIndex(`${vrn}:rd`, 800));

  result.vehicle_insurance_details = {
    insurance_from: '',
    insurance_upto: isoDateDaysFromNow(vrn, insDays),
    insurance_company_code: pickIndex(`${vrn}:icc`, 999),
    insurance_company_name: INSURERS[pickIndex(`${vrn}:insurer`, INSURERS.length)],
    opdt: '',
    policy_no: `OG-${pickIndex(`${vrn}:pol`, 99)}-${pickIndex(`${vrn}:pol2`, 9999)}`,
    vahan_verify: '',
    reg_no: vrn,
  };

  result.vehicle_pucc_details = {
    pucc_from: '',
    pucc_upto: isoDateDaysFromNow(vrn, fitDays - 2),
    pucc_centreno: '',
    pucc_no: `${geo.state_code}${String(pickIndex(`${vrn}:pucc`, 99999999)).padStart(12, '0')}`,
    op_dt: '',
  };

  result.financer_details = {
    hp_type: 'HT',
    financer_name: FINANCERS[pickIndex(`${vrn}:fin`, FINANCERS.length)],
    financer_address_line1: geo.state,
    financer_address_line2: '',
    financer_address_line3: '',
    financer_district: pickIndex(`${vrn}:fd`, 300),
    financer_pincode: 841410,
    financer_state: geo.state_code,
    financer_full_address: `${FINANCERS[pickIndex(`${vrn}:fin`, FINANCERS.length)]}, ${geo.state}`,
    hypothecation_dt: isoDateDaysFromNow(vrn, -300),
    op_dt: isoDateDaysFromNow(vrn, -295),
  };

  return response;
}

async function main() {
  const outArgIdx = process.argv.indexOf('--out');
  const outPath =
    outArgIdx >= 0
      ? path.resolve(process.argv[outArgIdx + 1])
      : path.join(repoRoot, 'docs/rc_advance_mock_by_vrn.json');

  const khananPath = path.join(repoRoot, 'docs/khanan_sample_5000.json');
  const templatePath = path.join(repoRoot, 'docs/rc_advance_api_sample.json');

  const [khananRaw, templateRaw] = await Promise.all([
    readFile(khananPath, 'utf8'),
    readFile(templatePath, 'utf8'),
  ]);

  const khanan = JSON.parse(khananRaw);
  const template = JSON.parse(templateRaw);
  const vrns = [
    ...new Set(
      khanan
        .map((row) => String(row.vehicleRegNo ?? '').trim().toUpperCase())
        .filter(Boolean),
    ),
  ].sort();

  /** @type {Record<string, unknown>} */
  const output = {};
  for (const vrn of vrns) {
    output[vrn] = buildResponseForVrn(vrn, template);
  }

  await writeFile(outPath, JSON.stringify(output));
  console.log(`Wrote ${vrns.length} mock RC Advance responses to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
