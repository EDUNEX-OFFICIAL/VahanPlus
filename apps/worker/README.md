# @vahanplus/worker

BullMQ consumer for scrape jobs. Runs Bihar ePass HTTP scrapers (and Playwright stub for other types).

## Run

```bash
# From repo root (with Postgres + Redis up)
pnpm --filter @vahanplus/worker dev

# Production
pnpm --filter @vahanplus/worker start
```

Requires `DATABASE_URL`, `REDIS_URL`.

## Scraper settings (primary)

Use the web UI: **Khanan → Khanan Config** (`/khanan/config`). Settings live in the database; the worker picks them up within ~30 seconds.

`.env` / `.env.example` are fallbacks for first seed and disaster recovery only.

## Concurrency and limiter (when no DB config)

- `WORKER_CONCURRENCY` (default **4**)
- BullMQ limiter: `BIHAR_PORTAL_RATE_LIMIT_MAX` / `BIHAR_PORTAL_RATE_LIMIT_DURATION_MS`

## Scripts

| Script | Command |
|--------|---------|
| Vehicle status backfill | `pnpm --filter @vahanplus/worker backfill:vehicle-status` |
| Capped backfill (100) | `pnpm --filter @vahanplus/worker backfill:vehicle-status:100` |
| Challan pass backfill | `pnpm --filter @vahanplus/worker backfill:challan-passes` |
| Fanout consigners for latest snapshot | `node apps/worker/scripts/trigger-epass-details.mjs` |
| Integration smoke | `node apps/worker/scripts/test-epass-integration.mjs` |

Always pass `--limit N` for large backfills.

## Queue paused / stuck jobs

If the UI or API enqueued too many jobs:

1. Ensure worker is running.
2. Check Redis queue state: `node scripts/check-redis-queue.mjs`
3. Resume or clean: `node scripts/fix-vehicle-status-queue.mjs`

## rawCapture storage

By default only a summary is stored (`STORE_RAW_CAPTURE=false`). Set `STORE_RAW_CAPTURE=true` for full scrape payloads when debugging.

## Related docs

- [Bihar ePass pipeline](../../docs/scraping/bihar-epass-pipeline.md)
- [Khanan Config UI](../../apps/web/src/app/(dashboard)/khanan/config/page.tsx) — scraper control for operators
- [@vahanplus/epass-orchestrator](../../packages/epass-orchestrator/README.md)
