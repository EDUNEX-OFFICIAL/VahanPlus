import { fetchReportHtml } from './fetch.js';
import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { parseConsignerTable } from './consigner-parser.js';
import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';

export class BiharEpassConsignerScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const url = ctx.target;
    try {
      const html = await fetchReportHtml(url, fetchOptionsFromMetadata(ctx.metadata));
      const report = parseConsignerTable(html, url);
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
