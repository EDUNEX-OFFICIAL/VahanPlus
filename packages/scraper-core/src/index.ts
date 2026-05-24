import {
  biharEpassScraper,
  biharEpassConsignerScraper,
  biharEpassChallanScraper,
  biharEpassChallanPassScraper,
  biharMcvVehicleStatusScraper,
} from '@vahanplus/scraper-bihar-epass';

export interface ScrapeContext {
  target: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface ScrapeResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface Scraper {
  scrape(ctx: ScrapeContext): Promise<ScrapeResult>;
}

export const noopScraper: Scraper = {
  async scrape(ctx: ScrapeContext): Promise<ScrapeResult> {
    return {
      success: true,
      data: {
        stub: true,
        target: ctx.target,
        type: ctx.type,
        scrapedAt: new Date().toISOString(),
      },
    };
  },
};

const registry = new Map<string, Scraper>([
  ['default', noopScraper],
  ['bihar_epass', biharEpassScraper],
  ['bihar_epass_consigner', biharEpassConsignerScraper],
  ['bihar_epass_challan', biharEpassChallanScraper],
  ['bihar_epass_challan_pass', biharEpassChallanPassScraper],
  ['bihar_mcv_vehicle_status', biharMcvVehicleStatusScraper],
]);

export function resolveScraper(type: string): Scraper {
  return registry.get(type) ?? noopScraper;
}

/** @deprecated Use resolveScraper(type) */
export function createScraper(_options?: { name?: string }): Scraper {
  return noopScraper;
}
