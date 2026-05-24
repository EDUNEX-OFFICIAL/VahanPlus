# Agent guide — VahanPlus

## Monorepo layout

| Path | Role |
|------|------|
| `apps/web` | Next.js dashboard |
| `apps/api-express` | REST API + queue producers |
| `apps/worker` | BullMQ consumer + ETL |
| `packages/contracts` | Shared constants (`QUEUE_NAMES`, etc.) |
| `packages/db` | Prisma client |
| `packages/scraper-bihar-epass` | Bihar portal HTTP scrapers |
| `packages/scraper-core` | `resolveScraper()` registry |
| `packages/epass-orchestrator` | **Single** fanout/enqueue implementation |
| `packages/khanan-config` | DB-backed scraper settings loader (cache + presets) |
| `packages/browser-pool` | Playwright pool (stub default) |

## Build order

```bash
pnpm bootstrap
# or manually:
pnpm --filter @vahanplus/contracts build
pnpm --filter @vahanplus/scraper-bihar-epass build
pnpm --filter @vahanplus/scraper-core build
pnpm --filter @vahanplus/khanan-config build
pnpm --filter @vahanplus/epass-orchestrator build
pnpm --filter @vahanplus/browser-pool build
pnpm db:generate && pnpm --filter @vahanplus/db build
```

Then `pnpm build` for apps.

## Bihar ePass scraping

Full pipeline doc: [docs/scraping/bihar-epass-pipeline.md](docs/scraping/bihar-epass-pipeline.md).

### Do not duplicate orchestrator logic

Enqueue/fanout **must** live in `packages/epass-orchestrator`. Import from `@vahanplus/epass-orchestrator` in worker and api-express — never add a second `epassOrchestrator.js` in apps.

### Key worker entry

`apps/worker/src/index.js` — limiter, concurrency, ETL, fanout calls.

### Throttle model

Portal safety uses worker BullMQ limiter + post delay from **Khanan Config** (DB), not stacked per-job multi-second delays on fanout.

### Operator UI

`/khanan/config` — do not add duplicate scraper toggles on other pages; use `apps/api-express/src/routes/scraperConfig.js`.

## Tests

```bash
pnpm --filter @vahanplus/scraper-bihar-epass test:challan-pass
pnpm --filter @vahanplus/scraper-bihar-epass test:mcv-vehicle-status
pnpm --filter @vahanplus/scraper-bihar-epass test:http-client
pnpm build
pnpm lint
```
