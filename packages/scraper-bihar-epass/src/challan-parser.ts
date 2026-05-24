import * as cheerio from 'cheerio';
import { isActiveLink, resolvePortalUrl } from './urls.js';
import {
  EpassChallanReportSchema,
  type EpassChallanLine,
  type EpassChallanReport,
} from './types.js';

function parseIntSafe(raw: string): number {
  const n = Number.parseInt(raw.replace(/,/g, '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatSafe(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function parseChallanTable(html: string, sourceUrl: string): EpassChallanReport {
  const $ = cheerio.load(html);
  const table = $('#ctl00_MainContent_grd');
  if (!table.length) {
    throw new Error('Challan table #ctl00_MainContent_grd not found');
  }

  const rows: EpassChallanLine[] = [];

  table.find('tr').each((_, tr) => {
    const $tr = $(tr);
    if ($tr.find('th').length > 0) return;

    const slText = $tr.find('span[id$="_lblslno"]').first().text().trim();
    const slNo = parseIntSafe(slText);
    if (slNo <= 0) return;

    const tds = $tr.children('td');
    const consigneeName =
      $tr.find('input[id$="_hdfConsigneeName"]').attr('value') ||
      tds.eq(1).text().replace(/\s+/g, ' ').trim();

    const mineral = tds.eq(2).text().replace(/\s+/g, ' ').trim() || null;
    const mineralCategory = tds.eq(3).text().replace(/\s+/g, ' ').trim() || null;

    const $passLink = $tr.find('a[id$="_Apass"]').first();
    const challanCount = parseIntSafe($passLink.find('span[id$="_lblPass"]').text());
    const href = $passLink.attr('href');
    const detailUrl = isActiveLink(href, $passLink) ? resolvePortalUrl(href) : null;

    const dispatchedQty = parseFloatSafe(tds.eq(5).text());
    const unit = tds.eq(6).text().replace(/\s+/g, ' ').trim() || null;

    rows.push({
      slNo,
      consigneeName: consigneeName || 'UNKNOWN',
      mineral,
      mineralCategory,
      challanCount,
      dispatchedQty,
      unit,
      detailUrl: detailUrl ?? undefined,
    });
  });

  return EpassChallanReportSchema.parse({
    sourceUrl,
    scrapedAt: new Date().toISOString(),
    rowCount: rows.length,
    rows,
  });
}
