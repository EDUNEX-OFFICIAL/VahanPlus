import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { normalizeVehicleRegNo } from './normalize-vrn.js';
import {
  McvVehicleStatusReportSchema,
  type McvVehicleStatusLine,
  type McvVehicleStatusReport,
} from './types.js';

function parseDecimalSafe(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function cellText($tr: cheerio.Cheerio<Element>, index: number): string {
  return $tr.children('td').eq(index).text().replace(/\s+/g, ' ').trim();
}

export function parseMcvVehicleStatusTable(
  html: string,
  sourceUrl: string,
  searchedVehicleRegNo: string,
): McvVehicleStatusReport {
  const $ = cheerio.load(html);
  const table = $('#grdVehicleSts');
  const normalizedSearch = normalizeVehicleRegNo(searchedVehicleRegNo) ?? searchedVehicleRegNo;

  if (!table.length) {
    return McvVehicleStatusReportSchema.parse({
      sourceUrl,
      scrapedAt: new Date().toISOString(),
      vehicleRegNo: normalizedSearch,
      found: false,
      row: null,
    });
  }

  let dataRow: McvVehicleStatusLine | null = null;

  table.find('tr').each((_, tr) => {
    if (dataRow) return;
    const $tr = $(tr);
    if ($tr.find('th').length > 0) return;

    if ($tr.children('td').length < 11) return;

    const ksRegNo = cellText($tr, 0);
    const vehicleRegNo = normalizeVehicleRegNo(cellText($tr, 1)) ?? cellText($tr, 1);
    if (!vehicleRegNo) return;

    dataRow = {
      ksRegNo: ksRegNo || null,
      vehicleRegNo,
      vehicleClass: cellText($tr, 2) || null,
      rcFitUpTo: cellText($tr, 3) || null,
      rcTaxUpTo: cellText($tr, 4) || null,
      insuranceUpTo: cellText($tr, 5) || null,
      puccUpTo: cellText($tr, 6) || null,
      imeiNo: cellText($tr, 7) || null,
      esimValidity: cellText($tr, 8) || null,
      grossWeightMt: parseDecimalSafe(cellText($tr, 9)),
      unladenWeightMt: parseDecimalSafe(cellText($tr, 10)),
    };
  });

  return McvVehicleStatusReportSchema.parse({
    sourceUrl,
    scrapedAt: new Date().toISOString(),
    vehicleRegNo: normalizedSearch,
    found: dataRow != null,
    row: dataRow,
  });
}
