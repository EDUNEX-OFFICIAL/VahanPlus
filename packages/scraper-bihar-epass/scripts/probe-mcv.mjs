import { writeFileSync } from 'node:fs';

const url = 'https://khanansoft.bihar.gov.in/portal/MCVReports/MCVReportWiseStatus.aspx';
const res = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' },
});
console.log('status', res.status);
const html = await res.text();
writeFileSync('scripts/mcv-probe.html', html);
const patterns = [
  /name="(ctl00\$MainContent\$[^"]+)"/g,
  /id="(ctl00_[^"]+)"/g,
];
for (const re of patterns) {
  const ids = new Set();
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  console.log('---', re.source, 'count', ids.size);
  console.log([...ids].sort().slice(0, 40).join('\n'));
}
