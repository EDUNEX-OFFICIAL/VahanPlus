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
