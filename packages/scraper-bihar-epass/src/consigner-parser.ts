import * as cheerio from 'cheerio';
import { isActiveLink, resolvePortalUrl } from './urls.js';
import {
  EpassConsignerReportSchema,
  type EpassConsignerRow,
  type EpassConsignerReport,
} from './types.js';

function parseIntSafe(raw: string): number {
  const n = Number.parseInt(raw.replace(/,/g, '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

export function parseConsignerTable(html: string, sourceUrl: string): EpassConsignerReport {
  const $ = cheerio.load(html);
  const table = $('#ctl00_MainContent_grd');
  if (!table.length) {
    throw new Error('Consigner table #ctl00_MainContent_grd not found');
  }

  const rows: EpassConsignerRow[] = [];

  table.find('tr').each((_, tr) => {
    const $tr = $(tr);
    if ($tr.find('th').length > 0) return;

    const slText = $tr.find('span[id$="_lblslno"]').first().text().trim();
    const slNo = parseIntSafe(slText);
    if (slNo <= 0) return;

    const tds = $tr.children('td');
    const consignerName = tds.eq(1).text().replace(/\s+/g, ' ').trim();
    const mineral = tds.eq(2).text().replace(/\s+/g, ' ').trim() || null;
    const mineralType = tds.eq(3).text().replace(/\s+/g, ' ').trim() || null;

    const $permitLink = $tr.find('a[id$="_Apermit"]').first();
    const challanCount = parseIntSafe($permitLink.find('span[id$="_lblPermit"]').text());
    const href = $permitLink.attr('href');
    const challanDetailUrl =
      isActiveLink(href, $permitLink) ? resolvePortalUrl(href) : null;

    const leaseId = $tr.find('input[id$="_hdnLeaseId"]').attr('value');
    const mineralId = $tr.find('input[id$="_hdnMinId"]').attr('value');

    rows.push({
      slNo,
      consignerName: consignerName || 'UNKNOWN',
      mineral,
      mineralType,
      challanCount,
      challanDetailUrl: challanDetailUrl ?? undefined,
      leaseId: leaseId || undefined,
      mineralId: mineralId || undefined,
    });
  });

  return EpassConsignerReportSchema.parse({
    sourceUrl,
    scrapedAt: new Date().toISOString(),
    rowCount: rows.length,
    rows,
  });
}
