import { fetchMcvVehicleStatusHtml } from './mcv-fetch.js';
import { fetchOptionsFromMetadata } from './http/fetch-options.js';
import { MCV_VEHICLE_STATUS_URL } from './mcv-urls.js';
import { parseMcvVehicleStatusTable } from './mcv-vehicle-status-parser.js';
import { normalizeVehicleRegNo } from './normalize-vrn.js';
import type { ScrapeContext, ScrapeResult, Scraper } from './scraper-types.js';

export class BiharMcvVehicleStatusScraper implements Scraper {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    const rawVrn = String(ctx.metadata?.vehicleRegNo ?? '');
    const vehicleRegNo = normalizeVehicleRegNo(rawVrn);
    if (!vehicleRegNo) {
      return { success: false, error: 'metadata.vehicleRegNo is required' };
    }

    try {
      const html = await fetchMcvVehicleStatusHtml(
        vehicleRegNo,
        fetchOptionsFromMetadata(ctx.metadata),
      );
      const report = parseMcvVehicleStatusTable(html, MCV_VEHICLE_STATUS_URL, vehicleRegNo);
      return {
        success: true,
        data: {
          ...report,
          jobId: ctx.metadata?.jobId,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MCV vehicle status scrape failed';
      return { success: false, error: message };
    }
  }
}

export const biharMcvVehicleStatusScraper = new BiharMcvVehicleStatusScraper();
