# @vahanplus/scraper-core

Scraper registry for worker job types.

## resolveScraper(type)

Maps `ScrapeType` / job `type` string to an implementation:

| Type | Implementation |
|------|----------------|
| `bihar_epass` | District report (alias → consigner flow in registry) |
| `bihar_epass_consigner` | Consigner table |
| `bihar_epass_challan` | Challan table |
| `bihar_epass_challan_pass` | Pass table |
| `bihar_mcv_vehicle_status` | MCV vehicle grid |
| (unknown) | Noop / fallback scraper |

Source: `src/index.ts` — imports from `@vahanplus/scraper-bihar-epass`.

## Adding a new job type

1. Implement scraper in `packages/scraper-bihar-epass` (or new package).
2. Register in `scraper-core/src/index.ts`.
3. Add Prisma `ScrapeType` enum + ETL in worker.
4. Add fanout in `@vahanplus/epass-orchestrator` if part of the pipeline.
5. Document in `docs/scraping/bihar-epass-pipeline.md`.

Build order: `scraper-bihar-epass` → `scraper-core` → `epass-orchestrator` → worker.
