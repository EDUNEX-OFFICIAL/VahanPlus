import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { parseChallanTable } from './challan-parser.js';
import { scrapePaginatedGrid } from './paginated-grid-scrape.js';
import { EpassChallanReportSchema } from './types.js';
import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';

export class BiharEpassChallanScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const url = ctx.target;
    try {
      const scraped = await scrapePaginatedGrid(
        url,
        (html, sourceUrl) => parseChallanTable(html, sourceUrl).rows,
        fetchOptionsFromMetadata(ctx.metadata),
      );
      const report = EpassChallanReportSchema.parse({
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
          consignerRowId: ctx.metadata?.consignerRowId,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Challan scrape failed';
      return { success: false, error: message };
    }
  }
}

export const biharEpassChallanScraper = new BiharEpassChallanScraper();
