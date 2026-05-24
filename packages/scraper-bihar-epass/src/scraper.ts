import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';
import { fetchReportHtml } from './fetch.js';
import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { parseDistrictTable } from './parser.js';
import { DEFAULT_REPORT_URL } from './types.js';

export interface BiharEpassMetadata {
  limit?: number;
  date?: string;
  storeRawHtml?: boolean;
}

export class BiharEpassScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const meta = (ctx.metadata ?? {}) as BiharEpassMetadata;
    const url = ctx.target || DEFAULT_REPORT_URL;
    const limit = meta.limit ?? 10;

    try {
      const html = await fetchReportHtml(url, {
        ...fetchOptionsFromMetadata(ctx.metadata),
        date: meta.date ?? (ctx.metadata?.date as string | undefined),
      });
      const report = parseDistrictTable(html, { limit, sourceUrl: url });

      const data: Record<string, unknown> = {
        ...report,
      };
      if (meta.storeRawHtml) {
        data.rawHtmlLength = html.length;
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown scrape error';
      return { success: false, error: message };
    }
  }
}

export const biharEpassScraper = new BiharEpassScraper();
