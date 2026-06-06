import {
  aspnetPostBackFromHtml,
  fetchHtmlGetWithCookie,
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

function hasViewAllLink(html: string): boolean {
  return /id=["']ctl00_MainContent_lbtnAll["']/i.test(html);
}

function pageSize(paging: PortalPaging): number {
  return Math.max(1, paging.end - paging.start + 1);
}

function totalPages(paging: PortalPaging): number {
  return Math.ceil(paging.total / pageSize(paging));
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
  complete: boolean;
}

export function gridMetadataFromFetch(
  fetch: PaginatedGridFetchResult,
  rowCount: number,
): PaginatedGridMetadata {
  const portalTotal = fetch.portalTotal;
  const complete =
    fetch.complete ||
    (portalTotal != null && portalTotal > 0 ? rowCount >= portalTotal : fetch.pages.length === 1);
  return {
    portalTotal,
    pagesFetched: fetch.pagesFetched,
    complete,
  };
}

async function fetchRemainingPages(
  url: string,
  startHtml: string,
  startCookie: string,
  paging: PortalPaging,
  options: HttpClientOptions,
): Promise<{ pages: string[]; cookie: string; complete: boolean }> {
  const pages: string[] = [];
  let cookie = startCookie;
  let currentHtml = startHtml;
  const lastPage = Math.min(totalPages(paging), MAX_PAGE_FETCHES);

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await aspnetPostBackFromHtml(url, currentHtml, GRID_EVENT_TARGET, `Page$${page}`, {
      ...options,
      cookie,
    });
    cookie = next.cookie;
    currentHtml = next.html;
    pages.push(currentHtml);

    const pagePaging = parsePortalPaging(currentHtml);
    if (pagePaging && isPagingComplete(pagePaging, pagePaging.end)) {
      return { pages, cookie, complete: true };
    }
  }

  const lastPaging = parsePortalPaging(currentHtml);
  return {
    pages,
    cookie,
    complete: isPagingComplete(lastPaging ?? paging, lastPaging?.end ?? paging.end),
  };
}

async function tryViewAllFallback(
  url: string,
  firstHtml: string,
  firstCookie: string,
  portalTotal: number,
  options: HttpClientOptions,
): Promise<PaginatedGridFetchResult | null> {
  if (!hasViewAllLink(firstHtml)) return null;

  const viewAll = await aspnetPostBackFromHtml(url, firstHtml, VIEW_ALL_TARGET, '', {
    ...options,
    cookie: firstCookie,
  });
  const viewAllPaging = parsePortalPaging(viewAll.html);
  const total = viewAllPaging?.total ?? portalTotal;

  if (!viewAllPaging || isPagingComplete(viewAllPaging, viewAllPaging.end)) {
    return {
      pages: [viewAll.html],
      portalTotal: total,
      pagesFetched: 2,
      complete: true,
    };
  }

  const remaining = await fetchRemainingPages(
    url,
    viewAll.html,
    viewAll.cookie,
    viewAllPaging,
    options,
  );
  const pages = [viewAll.html, ...remaining.pages];
  return {
    pages,
    portalTotal: total,
    pagesFetched: pages.length + 1,
    complete: remaining.complete,
  };
}

/**
 * Fetch all ASP.NET grid pages for consigner/challan/challan-pass reports.
 * Page$N chain first; View All only if pages are still incomplete.
 */
export async function fetchAllGridPages(
  url: string,
  options: HttpClientOptions = {},
): Promise<PaginatedGridFetchResult> {
  const { html: firstHtml, cookie: firstCookie } = await fetchHtmlGetWithCookie(url, options);
  const firstPaging = parsePortalPaging(firstHtml);

  if (!firstPaging || isPagingComplete(firstPaging, firstPaging.end)) {
    return {
      pages: [firstHtml],
      portalTotal: firstPaging?.total ?? null,
      pagesFetched: 1,
      complete: true,
    };
  }

  let portalTotal = firstPaging.total;
  const pages: string[] = [firstHtml];

  const remaining = await fetchRemainingPages(url, firstHtml, firstCookie, firstPaging, options);
  pages.push(...remaining.pages);

  let complete = remaining.complete;

  if (!complete) {
    const fallback = await tryViewAllFallback(url, firstHtml, firstCookie, portalTotal, options);
    if (fallback) {
      return fallback;
    }
  }

  const lastPaging = parsePortalPaging(pages.at(-1) ?? firstHtml) ?? firstPaging;
  portalTotal = lastPaging.total;
  complete = complete || isPagingComplete(lastPaging, lastPaging.end);

  return {
    pages,
    portalTotal,
    pagesFetched: pages.length,
    complete,
  };
}
