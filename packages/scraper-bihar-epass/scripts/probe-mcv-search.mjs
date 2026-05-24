import { writeFileSync } from 'node:fs';

const url = 'https://khanansoft.bihar.gov.in/portal/MCVReports/MCVReportWiseStatus.aspx';
const vrn = 'BR01GN8970';

function parseHidden(html) {
  const fields = {};
  const re = /<input[^>]*type=["']hidden["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const tag = match[0];
    const nameMatch = /name=["']([^"']+)["']/i.exec(tag);
    const valueMatch = /value=["']([^"']*)["']/i.exec(tag);
    if (nameMatch) fields[nameMatch[1]] = valueMatch?.[1] ?? '';
  }
  return fields;
}

const getRes = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' },
});
const cookie = getRes.headers.getSetCookie?.()?.map((c) => c.split(';')[0]).join('; ')
  ?? getRes.headers.get('set-cookie') ?? '';
let html = await getRes.text();
const hidden = parseHidden(html);

const form = new URLSearchParams();
for (const [k, v] of Object.entries(hidden)) form.set(k, v);
form.set('txtvehicleno', vrn);
form.set('btnSubmit', 'Search');

await new Promise((r) => setTimeout(r, 2000));

const postRes = await fetch(url, {
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
    'Content-Type': 'application/x-www-form-urlencoded',
    Referer: url,
    Cookie: cookie,
  },
  body: form.toString(),
});
html = await postRes.text();
writeFileSync('scripts/mcv-search-result.html', html);
console.log('status', postRes.status, 'len', html.length);
const tableMatch = html.match(/<table[\s\S]*?<\/table>/gi);
console.log('tables', tableMatch?.length ?? 0);
if (tableMatch?.[0]) console.log(tableMatch[0].slice(0, 2000));
