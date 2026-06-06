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

export function mergeRowsBySlNo<T extends { slNo: number }>(pages: T[][]): T[] {
  const bySl = new Map<number, T>();
  for (const page of pages) {
    for (const row of page) {
      if (!bySl.has(row.slNo)) {
        bySl.set(row.slNo, row);
      }
    }
  }
  return [...bySl.values()].sort((a, b) => a.slNo - b.slNo);
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

/**
 * Fetch all ASP.NET grid pages for consigner/challan/challan-pass reports.
 * Tries View All first, then Page$N fallback.
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
  let cookie = firstCookie;
  let baseHtml = firstHtml;
  const pages: string[] = [firstHtml];

  if (hasViewAllLink(firstHtml)) {
    const viewAll = await aspnetPostBackFromHtml(url, firstHtml, VIEW_ALL_TARGET, '', {
      ...options,
      cookie: firstCookie,
    });
    cookie = viewAll.cookie;
    baseHtml = viewAll.html;
    pages.length = 0;
    pages.push(baseHtml);

    const viewAllPaging = parsePortalPaging(baseHtml);
    if (viewAllPaging) {
      portalTotal = viewAllPaging.total;
    }
    if (!viewAllPaging || isPagingComplete(viewAllPaging, viewAllPaging.end)) {
      return {
        pages,
        portalTotal,
        pagesFetched: pages.length,
        complete: true,
      };
    }
  }

  const paging = parsePortalPaging(baseHtml) ?? firstPaging;
  portalTotal = paging.total;

  const remaining = await fetchRemainingPages(url, baseHtml, cookie, paging, options);
  pages.push(...remaining.pages);

  return {
    pages,
    portalTotal,
    pagesFetched: pages.length,
    complete: remaining.complete,
  };
}
