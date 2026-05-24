import { aspnetFormPost, fetchHtmlGet } from './http/client.js';
import { getPortalHttpConfig } from './http/config.js';
import { DEFAULT_REPORT_URL, type FetchOptions } from './types.js';

export { parseHiddenInputs } from './http/client.js';

function resolveHttpOptions(options: FetchOptions) {
  const env = getPortalHttpConfig();
  return {
    timeoutMs: options.timeoutMs ?? env.timeoutMs,
    retries: options.retries ?? env.retries,
    postDelayMs: options.postDelayMs ?? env.postDelayMs,
  };
}

export async function fetchReportHtml(
  url: string = DEFAULT_REPORT_URL,
  options: FetchOptions = {},
): Promise<string> {
  const httpOpts = resolveHttpOptions(options);

  if (!options.date) {
    return fetchHtmlGet(url, httpOpts);
  }

  return aspnetFormPost(url, {
    ...httpOpts,
    extraFields: {
      'ctl00$MainContent$txtDate1': options.date,
      'ctl00$MainContent$btnshow': 'Show',
    },
  });
}
