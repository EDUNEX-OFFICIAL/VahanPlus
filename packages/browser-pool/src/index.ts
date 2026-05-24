export interface BrowserPoolOptions {
  maxBrowsers?: number;
  stub?: boolean;
}

export interface PageLike {
  url: () => string;
  close: () => Promise<void>;
}

export interface BrowserPool {
  withPage<T>(fn: (page: PageLike) => Promise<T>): Promise<T>;
  close: () => Promise<void>;
}

class StubPage implements PageLike {
  url() {
    return 'about:blank';
  }
  async close() {}
}

function isStubMode(options: BrowserPoolOptions): boolean {
  if (options.stub !== undefined) return options.stub;
  return globalThis.process?.env?.BROWSER_POOL_STUB === 'true';
}

export function createBrowserPool(options: BrowserPoolOptions = {}): BrowserPool {
  const stub = isStubMode(options);
  let browserCloser: (() => Promise<void>) | null = null;

  return {
    async withPage<T>(fn: (page: PageLike) => Promise<T>): Promise<T> {
      if (stub) {
        const page = new StubPage();
        try {
          return await fn(page);
        } finally {
          await page.close();
        }
      }

      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      browserCloser = () => browser.close();
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        return await fn(page as PageLike);
      } finally {
        await page.close();
        await context.close();
      }
    },
    async close() {
      if (browserCloser) {
        await browserCloser();
        browserCloser = null;
      }
    },
  };
}
