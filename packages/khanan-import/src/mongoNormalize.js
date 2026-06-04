/** Fixed mapping for Khanan Mongo / JSON export records (see docs/khanan_sample_5000.json). */
export const KHANAN_MONGO_IDENTITY_MAPPING = {
  district: 'district',
  consignerName: 'consignerName',
  date: 'date',
  sourceType: 'sourceType',
  consigneeName: 'consigneeName',
  challanNo: 'challanNo',
  mineralName: 'mineralName',
  mineralCategory: 'mineralCategory',
  vehicleRegNo: 'vehicleRegNo',
  destination: 'destination',
  transportedDate: 'transportedDate',
  quantity: 'quantity',
  unit: 'unit',
  checkStatus: 'checkStatus',
};

/**
 * @param {Record<string, unknown>} record
 * @returns {Record<string, string> | null}
 */
export function normalizeKhananMongoRecord(record) {
  if (!record || typeof record !== 'object') return null;

  /** @type {Record<string, string>} */
  const out = {};
  for (const [field, key] of Object.entries(KHANAN_MONGO_IDENTITY_MAPPING)) {
    const raw = record[key];
    if (raw == null) continue;
    if (typeof raw === 'object') continue;
    out[field] = String(raw).trim();
  }

  if (!out.district || !out.consignerName || !out.challanNo) return null;
  return out;
}

/**
 * @param {string} fileName
 * @returns {'json_array' | 'ndjson'}
 */
export function detectBulkFormat(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.jsonl') || lower.endsWith('.ndjson')) return 'ndjson';
  return 'json_array';
}
