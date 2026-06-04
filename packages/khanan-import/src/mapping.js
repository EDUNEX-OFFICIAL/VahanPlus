export const KHANAN_PASS_REQUIRED = [
  'vehicleRegNo',
  'district',
  'consignerName',
  'challanNo',
  'date',
];

export const KHANAN_PASS_ALIASES = {
  district: ['district', 'dmo', 'dmoname', 'dmo name'],
  consignerName: ['consignername', 'consigner'],
  date: ['date', 'reportdate', 'report date'],
  sourceType: ['sourcetype', 'operator', 'role'],
  consigneeName: ['consigneename', 'consignee'],
  challanNo: ['challanno', 'challan'],
  mineralName: ['mineralname', 'mineral'],
  mineralCategory: ['mineralcategory', 'category'],
  vehicleRegNo: ['vehicleregno', 'vrn', 'registration', 'vehicle reg no'],
  destination: ['destination'],
  transportedDate: ['transporteddate', 'pass date', 'passdate'],
  quantity: ['quantity', 'qty'],
  unit: ['unit'],
  checkStatus: ['checkstatus', 'status'],
};

function normalizeHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function buildKhananPassMapping(headers, aliases, required) {
  const mapping = {};
  const errors = [];
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const [field, aliasList] of Object.entries(aliases)) {
    const targets = new Set([normalizeHeader(field), ...aliasList.map(normalizeHeader)]);
    const match = normalized.find((h) => targets.has(h.norm));
    if (match) mapping[field] = match.raw;
  }

  for (const req of required) {
    if (!mapping[req]) {
      errors.push(`Missing required column for ${req}`);
    }
  }

  return { mapping, errors };
}

export function mapSourceTypeToOperator(raw) {
  const v = (raw ?? 'lessee').trim().toLowerCase();
  if (v === 'dealer') return 'dealer';
  return 'lessee';
}

export function pickKhananMapped(row, mapping) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (header && row[header] != null) out[field] = String(row[header]).trim();
  }
  return out;
}
