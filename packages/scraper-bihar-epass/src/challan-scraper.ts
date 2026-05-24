import { fetchReportHtml } from './fetch.js';
import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { parseChallanTable } from './challan-parser.js';
import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';

export class BiharEpassChallanScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const url = ctx.target;
    try {
      const html = await fetchReportHtml(url, fetchOptionsFromMetadata(ctx.metadata));
      const report = parseChallanTable(html, url);
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
