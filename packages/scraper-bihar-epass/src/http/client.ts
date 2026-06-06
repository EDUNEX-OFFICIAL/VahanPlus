import { getPortalHttpConfig } from './config.js';

export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
};

export interface HttpClientOptions {
  timeoutMs?: number;
  retries?: number;
  postDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  const base = 500 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
}

function shouldRetryStatus(status: number): boolean {
  return status >= 500 || status === 429 || status === 408;
}

async function drainResponse(res: Response): Promise<void> {
  try {
    await res.arrayBuffer();
  } catch {
    /* ignore */
  }
}

export function collectCookieHeader(res: Response): string {
  const getSetCookie = res.headers.getSetCookie?.bind(res.headers);
  if (getSetCookie) {
    const parts = getSetCookie();
    if (parts.length > 0) {
      return parts.map((c) => c.split(';')[0]).join('; ');
    }
  }
  return res.headers.get('set-cookie') ?? '';
}

export function parseHiddenInputs(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const re = /<input[^>]*type=["']hidden["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const nameMatch = /name=["']([^"']+)["']/i.exec(tag);
    const valueMatch = /value=["']([^"']*)["']/i.exec(tag);
    if (nameMatch) {
      fields[nameMatch[1]] = valueMatch?.[1] ?? '';
    }
  }
  return fields;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: HttpClientOptions = {},
): Promise<Response> {
  const defaults = getPortalHttpConfig();
  const timeoutMs = options.timeoutMs ?? defaults.timeoutMs;
  const retries = options.retries ?? defaults.retries;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (shouldRetryStatus(res.status) && attempt < retries) {
        await drainResponse(res);
        await sleep(backoffMs(attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(backoffMs(attempt));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Fetch failed');
}

export interface AspNetFormPostOptions extends HttpClientOptions {
  extraFields?: Record<string, string>;
}

/**
 * GET page for ViewState, optional delay, POST form fields (ASP.NET WebForms).
 */
export async function aspnetFormPost(
  url: string,
  options: AspNetFormPostOptions = {},
): Promise<string> {
  const defaults = getPortalHttpConfig();
  const postDelayMs = options.postDelayMs ?? defaults.postDelayMs;
  const httpOpts = { timeoutMs: options.timeoutMs, retries: options.retries };

  const getRes = await fetchWithRetry(
    url,
    { method: 'GET', headers: DEFAULT_HEADERS, redirect: 'follow' },
    httpOpts,
  );
  if (!getRes.ok) {
    throw new Error(`GET ${url} failed: ${getRes.status} ${getRes.statusText}`);
  }

  const cookie = collectCookieHeader(getRes);
  const hidden = parseHiddenInputs(await getRes.text());
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(hidden)) {
    form.set(key, value);
  }
  if (options.extraFields) {
    for (const [key, value] of Object.entries(options.extraFields)) {
      form.set(key, value);
    }
  }

  if (postDelayMs > 0) {
    await sleep(postDelayMs);
  }

  const postRes = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: url,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: form.toString(),
      redirect: 'follow',
    },
    httpOpts,
  );
  if (!postRes.ok) {
    throw new Error(`POST ${url} failed: ${postRes.status} ${postRes.statusText}`);
  }
  return postRes.text();
}

export async function fetchHtmlGet(url: string, options: HttpClientOptions = {}): Promise<string> {
  const res = await fetchWithRetry(
    url,
    { method: 'GET', headers: DEFAULT_HEADERS, redirect: 'follow' },
    options,
  );
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export interface AspNetPostBackResult {
  html: string;
  cookie: string;
}

/**
 * ASP.NET __doPostBack from an existing page (ViewState from current HTML).
 */
export async function aspnetPostBackFromHtml(
  url: string,
  html: string,
  eventTarget: string,
  eventArgument: string,
  options: AspNetFormPostOptions & { cookie?: string } = {},
): Promise<AspNetPostBackResult> {
  const defaults = getPortalHttpConfig();
  const postDelayMs = options.postDelayMs ?? defaults.postDelayMs;
  const httpOpts = { timeoutMs: options.timeoutMs, retries: options.retries };
  const cookie = options.cookie ?? '';

  const hidden = parseHiddenInputs(html);
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(hidden)) {
    form.set(key, value);
  }
  form.set('__EVENTTARGET', eventTarget);
  form.set('__EVENTARGUMENT', eventArgument);
  if (options.extraFields) {
    for (const [key, value] of Object.entries(options.extraFields)) {
      form.set(key, value);
    }
  }

  if (postDelayMs > 0) {
    await sleep(postDelayMs);
  }

  const postRes = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: url,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: form.toString(),
      redirect: 'follow',
    },
    httpOpts,
  );
  if (!postRes.ok) {
    throw new Error(`POST ${url} failed: ${postRes.status} ${postRes.statusText}`);
  }

  const nextCookie = collectCookieHeader(postRes) || cookie;
  return { html: await postRes.text(), cookie: nextCookie };
}

export interface FetchHtmlGetWithCookieResult {
  html: string;
  cookie: string;
}

export async function fetchHtmlGetWithCookie(
  url: string,
  options: HttpClientOptions = {},
): Promise<FetchHtmlGetWithCookieResult> {
  const res = await fetchWithRetry(
    url,
    { method: 'GET', headers: DEFAULT_HEADERS, redirect: 'follow' },
    options,
  );
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return {
    html: await res.text(),
    cookie: collectCookieHeader(res),
  };
}
