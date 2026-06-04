import { parsePortalReportDate } from '@vahanplus/scraper-bihar-epass';
import {
  KHANAN_PASS_REQUIRED,
  KHANAN_PASS_ALIASES,
  buildKhananPassMapping,
  mapSourceTypeToOperator,
  pickKhananMapped,
  commitKhananPassRows,
} from '@vahanplus/khanan-import';

export {
  KHANAN_PASS_REQUIRED,
  KHANAN_PASS_ALIASES,
  buildKhananPassMapping,
  mapSourceTypeToOperator,
  pickKhananMapped,
};

/**
 * @param {Record<string, string>[]} rows
 * @param {Record<string, string>} mapping
 */
export function buildKhananPassAnalyzeStats(rows, mapping) {
  const dates = new Set();
  const vrns = new Set();
  const warnings = [];
  let unparseableDates = 0;
  let blankVrn = 0;

  for (const row of rows) {
    const m = pickKhananMapped(row, mapping);
    const iso = parsePortalReportDate(m.date ?? '');
    if (m.date && !iso) unparseableDates += 1;
    else if (iso) dates.add(iso);

    const vrn = (m.vehicleRegNo ?? '').trim();
    if (!vrn) blankVrn += 1;
    else vrns.add(vrn.toUpperCase());
  }

  if (unparseableDates > 0) {
    warnings.push(`${unparseableDates} row(s) have unparseable date values.`);
  }
  if (blankVrn > 0) {
    warnings.push(`${blankVrn} row(s) have blank VRN.`);
  }

  const dateList = [...dates].sort();
  return {
    distinctDates: { count: dates.size, sample: dateList.slice(0, 5) },
    distinctVrns: vrns.size,
    warnings,
  };
}

/**
 * @param {import('@vahanplus/db').PrismaClient} prisma
 * @param {{
 *   rows: Record<string, string>[],
 *   mapping: Record<string, string>,
 *   replaceExisting?: boolean,
 *   refreshVehicleStatus?: boolean,
 * }} input
 */
export async function commitKhananPassImport(prisma, input) {
  return commitKhananPassRows(prisma, input.rows, input.mapping, {
    replaceExisting: input.replaceExisting,
    refreshVehicleStatus: input.refreshVehicleStatus,
  });
}
