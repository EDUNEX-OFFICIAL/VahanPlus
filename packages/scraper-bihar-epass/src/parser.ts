import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import type { Cheerio } from 'cheerio';
import { isActiveLink, resolvePortalUrl } from './urls.js';
import {
  EpassDistrictRowSchema,
  EpassReportMetaSchema,
  DEFAULT_REPORT_URL,
  type EpassDistrictRow,
  type EpassReportMeta,
  type ParseOptions,
} from './types.js';

const EXPECTED_COLUMNS = 12;
const HEADER_ROWS = 2;

interface ActiveSpan {
  value: string;
  rowsLeft: number;
}

function cellText($: cheerio.CheerioAPI, $td: Cheerio<Element>): string {
  const labelled = $td.find(
    'span[id$="_lblslno"], span[id$="_lblL1"], span[id$="_lblM1"], span[id$="_lblD1"], span[id$="_lblG1"], span[id$="_lblLQty"], span[id$="_lblDQty"]',
  );
  if (labelled.length > 0) {
    return labelled.first().text().replace(/\s+/g, ' ').trim();
  }
  const direct = $td.clone().children('input, script').remove().end().text();
  return direct.replace(/\s+/g, ' ').trim();
}

function hiddenValue($: cheerio.CheerioAPI, $td: Cheerio<Element>, suffix: string): string | undefined {
  const input = $td.find(`input[id$="${suffix}"]`).first();
  const val = input.attr('value');
  return val && val.length > 0 ? val : undefined;
}

function expandRow(
  $: cheerio.CheerioAPI,
  $tr: Cheerio<Element>,
  spanMap: Map<number, ActiveSpan>,
): string[] {
  const row: string[] = [];
  let col = 0;

  const fillSpan = () => {
    while (spanMap.has(col)) {
      const span = spanMap.get(col)!;
      row[col] = span.value;
      span.rowsLeft -= 1;
      if (span.rowsLeft <= 0) {
        spanMap.delete(col);
      }
      col += 1;
    }
  };

  fillSpan();

  $tr.children('td').each((_, td) => {
    fillSpan();
    const $td = $(td);
    const text = cellText($, $td);
    const rowspan = Number.parseInt($td.attr('rowspan') ?? '1', 10) || 1;
    const colspan = Number.parseInt($td.attr('colspan') ?? '1', 10) || 1;

    for (let c = 0; c < colspan; c += 1) {
      row[col + c] = text;
      if (rowspan > 1) {
        spanMap.set(col + c, { value: text, rowsLeft: rowspan - 1 });
      }
    }
    col += colspan;
  });

  fillSpan();
  return row;
}

function parseMineral(raw: string): string | null {
  const t = raw.trim();
  if (!t || t === '--') return null;
  return t;
}

function parseIntSafe(raw: string): number {
  const n = Number.parseInt(raw.replace(/,/g, '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatSafe(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function extractPassDetailUrl($: cheerio.CheerioAPI, $tr: Cheerio<Element>, spanSuffix: string): string | null {
  const $link = $tr.find(`a[id$="_${spanSuffix}"]`).filter((_, el) => {
    const $a = $(el);
    return isActiveLink($a.attr('href'), $a);
  });
  if ($link.length === 0) return null;
  return resolvePortalUrl($link.first().attr('href'));
}

function isDistrictName(value: string): boolean {
  const t = value.trim();
  if (!t || /^\d+$/.test(t)) return false;
  return /^[A-Z0-9\s().-]+$/.test(t) && t.length >= 2;
}

function gridRowToRecord(cells: string[], $: cheerio.CheerioAPI, $tr: Cheerio<Element>): EpassDistrictRow | null {
  while (cells.length < EXPECTED_COLUMNS) {
    cells.push('');
  }

  const slNo = parseIntSafe(cells[0] ?? '');
  if (slNo <= 0) return null;

  let dmoName = (cells[1] ?? '').trim();
  if (!isDistrictName(dmoName)) {
    const districtTd = $tr.children('td').filter((_, el) => {
      const text = cellText($, $(el));
      return isDistrictName(text);
    });
    if (districtTd.length > 0) {
      dmoName = cellText($, districtTd.first()).trim();
    }
  }

  const record: EpassDistrictRow = {
    slNo,
    dmoName: dmoName || 'UNKNOWN',
    lessee: {
      mineral: parseMineral(cells[2] ?? ''),
      users: parseIntSafe(cells[3] ?? ''),
      passes: parseIntSafe(cells[4] ?? ''),
      dispatchedQty: parseFloatSafe(cells[5] ?? ''),
    },
    dealer: {
      mineral: parseMineral(cells[6] ?? ''),
      users: parseIntSafe(cells[7] ?? ''),
      passes: parseIntSafe(cells[8] ?? ''),
      dispatchedQty: parseFloatSafe(cells[9] ?? ''),
    },
    total: {
      users: parseIntSafe(cells[10] ?? ''),
      passes: parseIntSafe(cells[11] ?? ''),
    },
  };

  const hiddenTd = $tr.children('td').has('input[id$="_hdnDMO"]').first() as Cheerio<Element>;
  if (hiddenTd.length) {
    record.dmoId = hiddenValue($, hiddenTd, '_hdnDMO');
    record.lesseeMineralId = hiddenValue($, hiddenTd, '_hdnMineralId');
    record.dealerMineralId = hiddenValue($, hiddenTd, '_hdnDealerMineralId');
  }

  record.lesseePassDetailUrl = extractPassDetailUrl($, $tr, 'AM1');
  record.dealerPassDetailUrl = extractPassDetailUrl($, $tr, 'AG1');

  return EpassDistrictRowSchema.parse(record);
}

export function extractMeta($: cheerio.CheerioAPI, _sourceUrl?: string): {
  reportDate: string;
  reportGeneratedOn: string;
} {
  const reportDate = $('#ctl00_MainContent_cldDate').text().trim() || 'unknown';
  const reportGeneratedOn = $('#ctl00_MainContent_LblrptGenDtm').text().trim() || 'unknown';
  return { reportDate, reportGeneratedOn };
}

export function parseDistrictTable(html: string, options: ParseOptions = {}): EpassReportMeta {
  const $ = cheerio.load(html);
  const limit = options.limit;
  const sourceUrl = options.sourceUrl ?? DEFAULT_REPORT_URL;
  const { reportDate, reportGeneratedOn } = extractMeta($, sourceUrl);

  const table = $('#ctl00_MainContent_grdepass');
  if (!table.length) {
    throw new Error('Report table #ctl00_MainContent_grdepass not found');
  }

  const rows: EpassDistrictRow[] = [];
  const spanMap = new Map<number, ActiveSpan>();
  let currentDistrict = '';

  table.find('tr').each((rowIndex, tr) => {
    if (rowIndex < HEADER_ROWS) return;
    if (limit !== undefined && rows.length >= limit) return false;

    const $tr = $(tr);
    if ($tr.find('th').length > 0) return;

    const grid = expandRow($, $tr, spanMap);
    const record = gridRowToRecord(grid, $, $tr);
    if (!record) return;

    if (isDistrictName(record.dmoName)) {
      currentDistrict = record.dmoName;
    } else if (currentDistrict) {
      record.dmoName = currentDistrict;
    }

    rows.push(record);
  });

  const meta: EpassReportMeta = {
    reportDate,
    reportGeneratedOn,
    sourceUrl,
    scrapedAt: new Date().toISOString(),
    rowCount: rows.length,
    rows,
  };

  return EpassReportMetaSchema.parse(meta);
}
