import type { PaginatedGridScrapeResult } from './paginated-grid-scrape.js';

export function paginatedReportFields<TRow>(scraped: PaginatedGridScrapeResult<TRow>) {
  return {
    portalTotal: scraped.metadata.portalTotal,
    complete: scraped.metadata.complete,
    pagesFetched: scraped.metadata.pagesFetched,
    perPageRowCounts: scraped.metadata.perPageRowCounts,
    duplicatePagesSkipped: scraped.metadata.duplicatePagesSkipped,
    incompleteReason: scraped.metadata.incompleteReason,
    ...(scraped.metadata.incompleteReason ? { warning: scraped.metadata.incompleteReason } : {}),
  };
}
