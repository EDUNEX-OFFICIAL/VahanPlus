# @vahanplus/scraper-bihar-epass

HTTP scrapers for Bihar KhananSoft ePass and MCV vehicle status portals.

## Portal URLs

| Scraper | URL |
|---------|-----|
| District report | `https://khanansoft.bihar.gov.in/portal/CitizenRpt/epassreportAllDist.aspx` |
| Consigner / challan / pass | Dynamic `target` from district/challan links |
| MCV vehicle status | `https://khanansoft.bihar.gov.in/portal/MCVReports/MCVReportWiseStatus.aspx` |

## HTTP flow

ASP.NET WebForms pattern (shared in `src/http/client.ts`):

1. **GET** page → parse hidden fields (`__VIEWSTATE`, etc.)
2. **Delay** `BIHAR_PORTAL_POST_DELAY_MS` (default 1000ms)
3. **POST** `application/x-www-form-urlencoded` with session cookies from `getSetCookie()`

MCV POST fields: `txtvehicleno`, `btnSubmit=Search`.

District report with date: extra fields `ctl00$MainContent$txtDate1`, `ctl00$MainContent$btnshow=Show`.

## Environment

| Variable | Default |
|----------|---------|
| `BIHAR_PORTAL_POST_DELAY_MS` | `1000` |
| `BIHAR_FETCH_TIMEOUT_MS` | `30000` |
| `BIHAR_FETCH_RETRIES` | `3` |

Job `metadata` may override `timeoutMs`, `retries`, `postDelayMs`.

## Fixtures and tests

```bash
pnpm --filter @vahanplus/scraper-bihar-epass build
pnpm --filter @vahanplus/scraper-bihar-epass test:challan-pass
pnpm --filter @vahanplus/scraper-bihar-epass test:mcv-vehicle-status
pnpm --filter @vahanplus/scraper-bihar-epass test:http-client
```

Fixtures: `fixtures/challan-pass-sample.html`, `fixtures/mcv-vehicle-status-sample.html`.

## Smoke (live portal)

```bash
pnpm --filter @vahanplus/scraper-bihar-epass smoke
```

Requires network access to the Bihar portal.

## Exports

Registered via `@vahanplus/scraper-core` (`resolveScraper`). Main types: `FetchOptions`, district/consigner/challan/pass/MCV scrapers.
