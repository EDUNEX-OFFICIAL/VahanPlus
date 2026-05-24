import * as cheerio from 'cheerio';
import { isActiveLink, resolvePortalUrl } from './urls.js';
import {
  EpassChallanPassReportSchema,
  type EpassChallanPassLine,
  type EpassChallanPassReport,
} from './types.js';

function parseIntSafe(raw: string): number {
  const n = Number.parseInt(raw.replace(/,/g, '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatSafe(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function parseChallanPassTable(html: string, sourceUrl: string): EpassChallanPassReport {
  const $ = cheerio.load(html);
  const table = $('#ctl00_MainContent_grd');
  if (!table.length) {
    throw new Error('Challan pass table #ctl00_MainContent_grd not found');
  }

  const rows: EpassChallanPassLine[] = [];

  table.find('tr').each((_, tr) => {
    const $tr = $(tr);
    if ($tr.find('th').length > 0) return;

    const slText = $tr.find('span[id$="_lblslno"]').first().text().trim();
    const slNo = parseIntSafe(slText);
    if (slNo <= 0) return;

    const tds = $tr.children('td');
    if (tds.length < 11) return;

    const tdText = (i: number) => tds.eq(i).text().replace(/\s+/g, ' ').trim();
    if (tdText(7) === 'Total') return;

    const consigneeName = tdText(1);
    const challanNo = $tr.find('span[id$="_lblLesseePass"]').first().text().trim();
    if (!challanNo) return;

    const mineral = tdText(3) || null;
    const mineralCategory = tdText(4) || null;
    const vehicleRegNo = tdText(5) || null;
    const destination = tdText(6) || null;
    const transportedDate = tdText(7) || null;
    const quantity = parseFloatSafe(tdText(8));
    const unit = tdText(9) || null;
    const checkStatus = tdText(10) || null;

    const portalPassId = $tr.find('input[id$="_hndpassid"]').attr('value')?.trim() || undefined;

    const $challanLink = $tr.find('a[id$="_hrefLink"]').first();
    const href = $challanLink.attr('href');
    const portalChallanUrl = isActiveLink(href, $challanLink)
      ? resolvePortalUrl(href)
      : null;

    rows.push({
      slNo,
      consigneeName: consigneeName || 'UNKNOWN',
      challanNo,
      portalPassId,
      mineral,
      mineralCategory,
      vehicleRegNo,
      destination,
      transportedDate,
      quantity,
      unit,
      checkStatus,
      portalChallanUrl: portalChallanUrl ?? undefined,
    });
  });

  return EpassChallanPassReportSchema.parse({
    sourceUrl,
    scrapedAt: new Date().toISOString(),
    rowCount: rows.length,
    rows,
  });
}
