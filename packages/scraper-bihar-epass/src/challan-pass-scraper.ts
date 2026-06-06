import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { parseChallanPassTable } from './challan-pass-parser.js';
import { scrapePaginatedGrid } from './paginated-grid-scrape.js';
import { EpassChallanPassReportSchema } from './types.js';
import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';

export class BiharEpassChallanPassScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const url = ctx.target;
    try {
      const scraped = await scrapePaginatedGrid(
        url,
        (html, sourceUrl) => parseChallanPassTable(html, sourceUrl).rows,
        (row) => [row.challanNo.trim(), row.portalPassId ?? '', row.vehicleRegNo ?? ''].join('|'),
        fetchOptionsFromMetadata(ctx.metadata),
      );
      const report = EpassChallanPassReportSchema.parse({
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
          challanRowId: ctx.metadata?.challanRowId,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Challan pass scrape failed';
      return { success: false, error: message };
    }
  }
}

export const biharEpassChallanPassScraper = new BiharEpassChallanPassScraper();
