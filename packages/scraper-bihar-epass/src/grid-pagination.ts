import {
  aspnetPostBackFromHtml,
  fetchHtmlGetWithCookie,
  gridTableFingerprint,
  type HttpClientOptions,
} from './http/client.js';

export interface PortalPaging {
  start: number;
  end: number;
  total: number;
}

export interface PaginatedGridFetchResult {
  pages: string[];
  portalTotal: number | null;
  pagesFetched: number;
  duplicatePagesSkipped: number;
  complete: boolean;
}

const GRID_EVENT_TARGET = 'ctl00$MainContent$grd';
const VIEW_ALL_TARGET = 'ctl00$MainContent$lbtnAll';
const MAX_PAGE_FETCHES = 500;

export function parsePortalPaging(html: string): PortalPaging | null {
  const label = html.match(/id=["']ctl00_MainContent_lblPaging["'][^>]*>([\s\S]*?)<\/span>/i);
  if (!label) return null;

  const match = label[1].match(
    /Results\s*<b>\s*(\d+)\s*<\/b>\s*-\s*<b>\s*(\d+)\s*<\/b>\s*Of\s*<b>\s*(\d+)\s*<\/b>/i,
  );
  if (!match) return null;

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  const total = Number.parseInt(match[3], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(total)) {
    return null;
  }
  return { start, end, total };
}

export function isPagingComplete(paging: PortalPaging | null, visibleEnd: number): boolean {
  if (!paging) return true;
  if (paging.total <= 0) return true;
  return visibleEnd >= paging.total;
}

export function parseGridPageNumbers(html: string): number[] {
  const pages = new Set<number>();
  const re = /__doPostBack\([^,]+,\s*(?:'|&#39;)Page\$(\d+)(?:'|&#39;)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const n = Number.parseInt(match[1], 10);
    if (Number.isFinite(n) && n > 1) pages.add(n);
  }
  return [...pages].sort((a, b) => a - b);
}

function hasViewAllLink(html: string): boolean {
  return /id=["']ctl00_MainContent_lbtnAll["']/i.test(html);
}

function pageSize(paging: PortalPaging): number {
  return Math.max(1, paging.end - paging.start + 1);
}

function totalPages(paging: PortalPaging): number {
  return Math.ceil(paging.total / pageSize(paging));
}

export function unionHtmlPagesByFingerprint(pages: string[]): {
  pages: string[];
  duplicatePagesSkipped: number;
} {
  const seen = new Set<string>();
  const unique: string[] = [];
  let duplicatePagesSkipped = 0;

  for (const html of pages) {
    const fp = gridTableFingerprint(html);
    if (seen.has(fp)) {
      duplicatePagesSkipped += 1;
      continue;
    }
    seen.add(fp);
    unique.push(html);
  }

  return { pages: unique, duplicatePagesSkipped };
}

/**
 * Portal grids restart Sl.No at 1 on each page — never dedupe paginated rows by slNo alone.
 */
export function mergePaginatedRows<T>(pages: T[][], rowKey: (row: T) => string): T[] {
  const byKey = new Map<string, T>();
  const order: string[] = [];

  for (const page of pages) {
    for (const row of page) {
      const key = rowKey(row);
      if (!byKey.has(key)) {
        byKey.set(key, row);
        order.push(key);
      }
    }
  }

  return order.map((key) => byKey.get(key)!);
}

/** @deprecated Use mergePaginatedRows — slNo restarts per portal page. */
export function mergeRowsBySlNo<T extends { slNo: number }>(pages: T[][]): T[] {
  return mergePaginatedRows(pages, (row) => String(row.slNo));
}

export interface PaginatedGridMetadata {
  portalTotal: number | null;
  pagesFetched: number;
  duplicatePagesSkipped: number;
  perPageRowCounts: number[];
  complete: boolean;
  incompleteReason?: string;
}

export function gridMetadataFromFetch(
  fetch: PaginatedGridFetchResult,
  rowCount: number,
  perPageRowCounts: number[],
): PaginatedGridMetadata {
  const portalTotal = fetch.portalTotal;
  const complete =
    fetch.complete ||
    (portalTotal != null && portalTotal > 0 ? rowCount >= portalTotal : fetch.pages.length === 1);

  let incompleteReason: string | undefined;
  if (!complete && portalTotal != null && portalTotal > rowCount) {
    incompleteReason = `Portal reports ${portalTotal} rows but ${rowCount} were scraped`;
    if (fetch.duplicatePagesSkipped > 0) {
      incompleteReason += ` (${fetch.duplicatePagesSkipped} duplicate pages skipped)`;
    }
  }

  return {
    portalTotal,
    pagesFetched: fetch.pagesFetched,
    duplicatePagesSkipped: fetch.duplicatePagesSkipped,
    perPageRowCounts,
    complete,
    incompleteReason,
  };
}

async function fetchPageChain(
  url: string,
  startHtml: string,
  startCookie: string,
  paging: PortalPaging,
  options: HttpClientOptions,
): Promise<{ pages: string[]; cookie: string; duplicatePagesSkipped: number; complete: boolean }> {
  const pages: string[] = [];
  let cookie = startCookie;
  let currentHtml = startHtml;
  let duplicatePagesSkipped = 0;
  const seenFingerprints = new Set<string>([gridTableFingerprint(startHtml)]);

  const linkedPages = parseGridPageNumbers(startHtml);
  const lastPage = Math.min(
    linkedPages.length > 0 ? Math.max(...linkedPages) : totalPages(paging),
    totalPages(paging),
    MAX_PAGE_FETCHES,
  );

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await aspnetPostBackFromHtml(url, currentHtml, GRID_EVENT_TARGET, `Page$${page}`, {
      ...options,
      cookie,
    });
    cookie = next.cookie;

    const fp = gridTableFingerprint(next.html);
    if (seenFingerprints.has(fp)) {
      duplicatePagesSkipped += 1;
      break;
    }
    seenFingerprints.add(fp);
    currentHtml = next.html;
    pages.push(currentHtml);

    const pagePaging = parsePortalPaging(currentHtml);
    if (pagePaging && isPagingComplete(pagePaging, pagePaging.end)) {
      return { pages, cookie, duplicatePagesSkipped, complete: true };
    }
  }

  const lastPaging = parsePortalPaging(currentHtml);
  return {
    pages,
    cookie,
    duplicatePagesSkipped,
    complete: isPagingComplete(lastPaging ?? paging, lastPaging?.end ?? paging.end),
  };
}

async function collectViewAllPages(
  url: string,
  firstHtml: string,
  firstCookie: string,
  portalTotal: number,
  options: HttpClientOptions,
): Promise<string[]> {
  if (!hasViewAllLink(firstHtml)) return [];

  const viewAll = await aspnetPostBackFromHtml(url, firstHtml, VIEW_ALL_TARGET, '', {
    ...options,
    cookie: firstCookie,
  });
  const collected = [viewAll.html];
  const viewAllPaging = parsePortalPaging(viewAll.html);
  const total = viewAllPaging?.total ?? portalTotal;

  if (!viewAllPaging || isPagingComplete(viewAllPaging, viewAllPaging.end)) {
    return collected;
  }

  const remaining = await fetchPageChain(url, viewAll.html, viewAll.cookie, viewAllPaging, options);
  collected.push(...remaining.pages);
  return collected;
}

/**
 * Fetch all ASP.NET grid pages for consigner/challan/challan-pass reports.
 * Unions Page$N chain + View All pages; dedupes duplicate HTML fingerprints.
 */
export async function fetchAllGridPages(
  url: string,
  options: HttpClientOptions = {},
): Promise<PaginatedGridFetchResult> {
  const { html: firstHtml, cookie: firstCookie } = await fetchHtmlGetWithCookie(url, options);
  const firstPaging = parsePortalPaging(firstHtml);
  const portalTotal = firstPaging?.total ?? null;

  if (!firstPaging || isPagingComplete(firstPaging, firstPaging.end)) {
    return {
      pages: [firstHtml],
      portalTotal,
      pagesFetched: 1,
      duplicatePagesSkipped: 0,
      complete: true,
    };
  }

  const allHtml: string[] = [firstHtml];

  const chain = await fetchPageChain(url, firstHtml, firstCookie, firstPaging, options);
  allHtml.push(...chain.pages);

  const viewAllPages = await collectViewAllPages(
    url,
    firstHtml,
    firstCookie,
    firstPaging.total,
    options,
  );
  allHtml.push(...viewAllPages);

  const { pages, duplicatePagesSkipped } = unionHtmlPagesByFingerprint(allHtml);
  const lastPaging = parsePortalPaging(pages.at(-1) ?? firstHtml) ?? firstPaging;
  const complete =
    isPagingComplete(firstPaging, firstPaging.end) || isPagingComplete(lastPaging, lastPaging.end);

  return {
    pages,
    portalTotal,
    pagesFetched: pages.length,
    duplicatePagesSkipped: duplicatePagesSkipped + chain.duplicatePagesSkipped,
    complete,
  };
}
