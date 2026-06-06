import { getPortalHttpConfig } from './http/config.js';
import type { HttpClientOptions } from './http/client.js';
import {
  fetchAllGridPages,
  gridMetadataFromFetch,
  mergePaginatedRows,
  type PaginatedGridMetadata,
} from './grid-pagination.js';
import type { FetchOptions } from './types.js';

function resolveHttpOptions(options: FetchOptions): HttpClientOptions {
  const env = getPortalHttpConfig();
  return {
    timeoutMs: options.timeoutMs ?? env.timeoutMs,
    retries: options.retries ?? env.retries,
    postDelayMs: options.postDelayMs ?? env.postDelayMs,
  };
}

export interface PaginatedGridScrapeResult<TRow> {
  rows: TRow[];
  rowCount: number;
  scrapedAt: string;
  metadata: PaginatedGridMetadata;
}

export async function scrapePaginatedGrid<TRow>(
  url: string,
  parseRows: (html: string, sourceUrl: string) => TRow[],
  rowKey: (row: TRow) => string,
  options: FetchOptions = {},
): Promise<PaginatedGridScrapeResult<TRow>> {
  const httpOpts = resolveHttpOptions(options);
  const fetch = await fetchAllGridPages(url, httpOpts);
  const rowPages = fetch.pages.map((html) => parseRows(html, url));
  const perPageRowCounts = rowPages.map((page) => page.length);
  const rows = mergePaginatedRows(rowPages, rowKey);
  const metadata = gridMetadataFromFetch(fetch, rows.length, perPageRowCounts);

  return {
    rows,
    rowCount: rows.length,
    scrapedAt: new Date().toISOString(),
    metadata,
  };
}
