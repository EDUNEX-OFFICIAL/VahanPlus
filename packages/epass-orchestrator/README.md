# @vahanplus/epass-orchestrator

Shared BullMQ enqueue and fanout for the Bihar ePass pipeline. **Use this package from worker and api-express — do not copy orchestrator logic into apps.**

## API

| Function | Description |
|----------|-------------|
| `enqueueConsignerJobsForSnapshot(prisma, snapshotId, parentJobId?)` | L1 → L2 fanout |
| `enqueueSingleConsignerJob(...)` | One consigner job |
| `enqueueChallanJobsForConsigners(prisma, rows)` | L2 → L3 |
| `enqueueChallanPassJobs(prisma, rows)` | L3 → L4 |
| `enqueueVehicleStatusJobs(prisma, vrns, parentJobId?)` | L4 → L5 (skips existing VRNs) |
| `enqueueMissingVehicleStatusFromPasses(prisma, { limit? })` | SQL backfill |
| `findMissingVehicleRegNos(prisma, { limit? })` | Distinct VRNs without status row |
| `getVehicleRegNosForChallanRow(prisma, challanRowId)` | DB-backed L4 fanout |
| `getScrapeQueue()` | BullMQ queue with default job options |
| `getQueueConnection()` | Redis connection for Worker |

Bulk: `bulkEnqueueScrapeJobs` (chunks of 100).

## CLI backfill (via worker package)

```bash
pnpm --filter @vahanplus/worker backfill:vehicle-status
pnpm --filter @vahanplus/worker backfill:vehicle-status --limit 100
pnpm --filter @vahanplus/worker backfill:challan-passes
```

## Environment flags

| Variable | Effect |
|----------|--------|
| `BIHAR_EPASS_SKIP_CHALLAN` | Skip L3 enqueue |
| `BIHAR_EPASS_SKIP_CHALLAN_PASS` | Skip L4 enqueue |
| `BIHAR_EPASS_SKIP_VEHICLE_STATUS` | Skip L5 enqueue |
| `BIHAR_EPASS_MAX_CONSIGNER_JOBS` | Cap L2 jobs per snapshot |
| `BIHAR_FANOUT_STAGGER_MS` | Optional per-index enqueue delay (default `0`) |
| `BIHAR_EPASS_DETAIL_DELAY_MS` | **Deprecated** — fallback for stagger only; logs warning |

Queue job defaults: 3 attempts, exponential backoff, Redis retention limits (see `src/config.js`).

## Dependencies

`@vahanplus/contracts`, `@vahanplus/db`, `bullmq`.
