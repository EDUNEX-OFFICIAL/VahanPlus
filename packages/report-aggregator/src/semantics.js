import { compareReportDates } from './dates.js';
import { normalizeConsignerName, normalizeDmoKey, normalizeMineralLabel } from './labels.js';

export const AGGREGATOR_VERSION = 1;

/**
 * @param {{ reportDate: string, scrapedAt: Date | string }} candidate
 * @param {{ reportDate: string, scrapedAt: Date | string }} incumbent
 */
export function candidateWins(candidate, incumbent) {
  const dateCmp = compareReportDates(candidate.reportDate, incumbent.reportDate);
  if (dateCmp > 0) return true;
  if (dateCmp < 0) return false;
  const cAt =
    candidate.scrapedAt instanceof Date
      ? candidate.scrapedAt.getTime()
      : new Date(candidate.scrapedAt).getTime();
  const iAt =
    incumbent.scrapedAt instanceof Date
      ? incumbent.scrapedAt.getTime()
      : new Date(incumbent.scrapedAt).getTime();
  return cAt > iAt;
}

export function districtEntityKey(dmoName) {
  return normalizeDmoKey(dmoName);
}

export function consignerEntityKey(row) {
  const dmo = row.districtRow?.dmoName ?? row.dmoName ?? '';
  const name = normalizeConsignerName(row.consignerName);
  return [normalizeDmoKey(dmo), row.operatorType, name.toLowerCase()].join('|');
}

export function consigneeEntityKey(row) {
  const consignerKey = consignerEntityKey({
    dmoName: row.consignerRow?.districtRow?.dmoName,
    operatorType: row.consignerRow?.operatorType,
    consignerName: row.consignerRow?.consignerName,
  });
  const mineral = (normalizeMineralLabel(row.mineral) ?? '').toLowerCase();
  return [consignerKey, (row.consigneeName ?? '').toLowerCase(), mineral, String(row.slNo)].join(
    '|',
  );
}

export function challanPassEntityKey(row, reportDate) {
  const qty = row.quantity != null ? Number(row.quantity) : 0;
  const transport = canonicalTransportDate(row.transportedDate);
  return [
    String(reportDate ?? '').toLowerCase(),
    (row.challanNo ?? '').toLowerCase(),
    (row.vehicleRegNo ?? '').toLowerCase(),
    transport,
    (row.destination ?? '').toLowerCase(),
    String(qty),
    (row.unit ?? '').toLowerCase(),
    (normalizeMineralLabel(row.mineral) ?? '').toLowerCase(),
    (row.checkStatus ?? '').toLowerCase(),
    (row.consigneeName ?? '').toLowerCase(),
  ].join('|');
}

function canonicalTransportDate(value) {
  if (!value) return '';
  const s = String(value).trim();
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s);
  if (m) return s.toLowerCase();
  const m2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m2) return `${m2[1].padStart(2, '0')}/${m2[2].padStart(2, '0')}/${m2[3]}`;
  return s.toLowerCase();
}

export function mineralEntityKey(mineral, operatorRole) {
  return `${String(mineral).toLowerCase()}|${operatorRole}`;
}
