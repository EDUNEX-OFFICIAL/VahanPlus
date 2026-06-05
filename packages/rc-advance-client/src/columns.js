import { flatKeysFromSample } from './flatten.js';
import { RESULT_STATUS_FLAT_KEY } from './schema.js';

/** @type {Record<string, string>} */
const KEY_LABELS = {
  status_code: 'Status Code',
  status: 'API Status',
  message: 'Message',
  txn_id: 'Txn ID',
  response_type: 'Response Type',
  billable: 'Billable',
  state_code: 'State Code',
  state: 'State',
  office_code: 'Office Code',
  office_name: 'Office Name',
  reg_no: 'Reg No',
  reg_date: 'Reg Date',
  purchase_date: 'Purchase Date',
  owner_count: 'Owner Count',
  owner_name: 'Owner Name',
  owner_father_name: 'Owner Father Name',
  current_address_line1: 'Current Address 1',
  current_address_line2: 'Current Address 2',
  current_address_line3: 'Current Address 3',
  current_district_name: 'Current District',
  current_state: 'Current State',
  current_state_name: 'Current State Name',
  current_pincode: 'Current Pincode',
  current_full_address: 'Current Full Address',
  permanent_address_line1: 'Permanent Address 1',
  permanent_address_line2: 'Permanent Address 2',
  permanent_address_line3: 'Permanent Address 3',
  permanent_district_name: 'Permanent District',
  permanent_state: 'Permanent State',
  permanent_state_name: 'Permanent State Name',
  permanent_pincode: 'Permanent Pincode',
  permanent_full_address: 'Permanent Full Address',
  owner_code_descr: 'Owner Code',
  reg_type_descr: 'Reg Type',
  vehicle_class_desc: 'Vehicle Class (RC)',
  chassis_no: 'Chassis No',
  engine_no: 'Engine No',
  vehicle_manufacturer_name: 'Manufacturer',
  model_code: 'Model Code',
  model: 'Model',
  body_type: 'Body Type',
  cylinders_no: 'Cylinders',
  vehicle_hp: 'HP',
  vehicle_seat_capacity: 'Seat Capacity',
  vehicle_standing_capacity: 'Standing Capacity',
  vehicle_sleeper_capacity: 'Sleeper Capacity',
  unladen_weight: 'Unladen Weight',
  vehicle_gross_weight: 'Gross Weight',
  vehicle_gross_comb_weight: 'Gross Comb Weight',
  fuel_descr: 'Fuel',
  color: 'Color',
  manufacturing_mon: 'Mfg Month',
  manufacturing_yr: 'Mfg Year',
  norms_descr: 'Norms',
  wheelbase: 'Wheelbase',
  cubic_cap: 'Cubic Cap',
  floor_area: 'Floor Area',
  ac_fitted: 'AC Fitted',
  audio_fitted: 'Audio Fitted',
  video_fitted: 'Video Fitted',
  vehicle_catg: 'Vehicle Category',
  dealer_code: 'Dealer Code',
  dealer_name: 'Dealer Name',
  dealer_address_line1: 'Dealer Address 1',
  dealer_address_line2: 'Dealer Address 2',
  dealer_address_line3: 'Dealer Address 3',
  dealer_district: 'Dealer District',
  dealer_pincode: 'Dealer Pincode',
  dealer_full_address: 'Dealer Full Address',
  sale_amount: 'Sale Amount',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  reg_upto: 'Reg Upto',
  fit_upto: 'Fit Upto',
  tax_upto: 'Tax Upto',
  annual_income: 'Annual Income',
  imported_vehicle: 'Imported Vehicle',
  [RESULT_STATUS_FLAT_KEY]: 'Vehicle Status',
  vehicle_type: 'Vehicle Type',
  tax_mode: 'Tax Mode',
  mobile_no: 'Mobile No',
  email_id: 'Email',
  pan_no: 'PAN',
  aadhar_no: 'Aadhar',
  passport_no: 'Passport',
  ration_card_no: 'Ration Card',
  voter_id: 'Voter ID',
  dl_no: 'DL No',
  insurance_insurance_from: 'Insurance From',
  insurance_insurance_upto: 'Insurance Upto (RC)',
  insurance_insurance_company_code: 'Insurance Company Code',
  insurance_insurance_company_name: 'Insurance Company',
  insurance_opdt: 'Insurance Opdt',
  insurance_policy_no: 'Policy No',
  insurance_vahan_verify: 'Insurance Vahan Verify',
  insurance_reg_no: 'Insurance Reg No',
  pucc_pucc_from: 'PUCC From',
  pucc_pucc_upto: 'PUCC Upto',
  pucc_pucc_centreno: 'PUCC Centre No',
  pucc_pucc_no: 'PUCC No',
  pucc_op_dt: 'PUCC Op Dt',
  financer_hp_type: 'Financer HP Type',
  financer_financer_name: 'Financer Name',
  financer_financer_address_line1: 'Financer Address 1',
  financer_financer_address_line2: 'Financer Address 2',
  financer_financer_address_line3: 'Financer Address 3',
  financer_financer_district: 'Financer District',
  financer_financer_pincode: 'Financer Pincode',
  financer_financer_state: 'Financer State',
  financer_financer_full_address: 'Financer Full Address',
  financer_hypothecation_dt: 'Hypothecation Date',
  financer_op_dt: 'Financer Op Dt',
};

/**
 * @param {string} key
 * @returns {string}
 */
export function rcAdvanceColumnLabel(key) {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  return key
    .replace(/^insurance_/, 'Insurance ')
    .replace(/^pucc_/, 'PUCC ')
    .replace(/^financer_/, 'Financer ')
    .replace(/^permit_/, 'Permit ')
    .replace(/^tax_/, 'Tax ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {Record<string, unknown>} sampleResponse
 * @returns {{ key: string; label: string }[]}
 */
export function buildRcAdvanceCrmColumns(sampleResponse) {
  const keys = flatKeysFromSample(sampleResponse);
  return keys.map((key) => ({ key, label: rcAdvanceColumnLabel(key) }));
}

/** @type {{ key: string; label: string }[] | null} */
let cachedColumns = null;

/**
 * @param {{ key: string; label: string }[]} columns
 */
export function setRcAdvanceCrmColumnsCache(columns) {
  cachedColumns = columns;
}

/**
 * @returns {{ key: string; label: string }[]}
 */
export function getRcAdvanceCrmColumns() {
  return cachedColumns ?? [];
}
