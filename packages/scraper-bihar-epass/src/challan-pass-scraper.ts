import { fetchReportHtml } from './fetch.js';
import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { parseChallanPassTable } from './challan-pass-parser.js';
import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';

export class BiharEpassChallanPassScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const url = ctx.target;
    try {
      const html = await fetchReportHtml(url, fetchOptionsFromMetadata(ctx.metadata));
      const report = parseChallanPassTable(html, url);
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
