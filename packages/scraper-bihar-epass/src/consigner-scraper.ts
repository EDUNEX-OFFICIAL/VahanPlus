import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { parseConsignerTable } from './consigner-parser.js';
import { scrapePaginatedGrid } from './paginated-grid-scrape.js';
import { EpassConsignerReportSchema } from './types.js';
import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';

export class BiharEpassConsignerScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const url = ctx.target;
    try {
      const scraped = await scrapePaginatedGrid(
        url,
        (html, sourceUrl) => parseConsignerTable(html, sourceUrl).rows,
        (row) =>
          [row.consignerName.trim().toLowerCase(), row.leaseId ?? '', row.mineral ?? ''].join('|'),
        fetchOptionsFromMetadata(ctx.metadata),
      );
      const report = EpassConsignerReportSchema.parse({
        sourceUrl: url,
        scrapedAt: scraped.scrapedAt,
        rowCount: scraped.rowCount,
        rows: scraped.rows,
        portalTotal: scraped.metadata.portalTotal,
        complete: scraped.metadata.complete,
        pagesFetched: scraped.metadata.pagesFetched,
      });
      return {
        success: true,
        data: {
          ...report,
          districtRowId: ctx.metadata?.districtRowId,
          operatorType: ctx.metadata?.operatorType ?? ctx.metadata?.role,
          role: ctx.metadata?.operatorType ?? ctx.metadata?.role,
          snapshotId: ctx.metadata?.snapshotId,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Consigner scrape failed';
      return { success: false, error: message };
    }
  }
}

export const biharEpassConsignerScraper = new BiharEpassConsignerScraper();
