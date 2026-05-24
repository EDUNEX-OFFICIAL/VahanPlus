import assert from 'node:assert/strict';
import { collectCookieHeader, parseHiddenInputs } from '../src/http/client.js';

function mockResponse(init: {
  status?: number;
  headers?: Record<string, string | string[]>;
  getSetCookie?: () => string[];
  text?: () => Promise<string>;
}): Response {
  const headers = new Headers();
  for (const [key, value] of Object.entries(init.headers ?? {})) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return {
    status: init.status ?? 200,
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    statusText: 'OK',
    headers: {
      get: (name: string) => headers.get(name),
      getSetCookie: init.getSetCookie,
    },
    text: init.text ?? (async () => ''),
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Response;
}

// collectCookieHeader prefers getSetCookie()
{
  const res = mockResponse({
    getSetCookie: () => ['ASP.NET_SessionId=abc123; path=/', 'Other=1; HttpOnly'],
  });
  assert.equal(collectCookieHeader(res), 'ASP.NET_SessionId=abc123; Other=1');
}

// fallback to set-cookie header
{
  const res = mockResponse({
    headers: { 'set-cookie': 'legacy=value; Path=/' },
  });
  assert.equal(collectCookieHeader(res), 'legacy=value; Path=/');
}

// parseHiddenInputs
{
  const html = `
    <form>
      <input type="hidden" name="__VIEWSTATE" value="VS" />
      <input type="hidden" name="__EVENTVALIDATION" value="EV" />
      <input type="text" name="ignored" value="x" />
    </form>
  `;
  const fields = parseHiddenInputs(html);
  assert.equal(fields.__VIEWSTATE, 'VS');
  assert.equal(fields.__EVENTVALIDATION, 'EV');
  assert.equal(fields.ignored, undefined);
}

console.log('http-client.test.ts: ok');
