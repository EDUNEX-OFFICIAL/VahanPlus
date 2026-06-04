# Khanan bulk JSON import and export

Production-scale import/export for 10M+ pass rows (~15GB) without loading the full file into HTTP JSON or browser memory.

## Formats

| Import               | Notes                                                                |
| -------------------- | -------------------------------------------------------------------- |
| `.jsonl` / `.ndjson` | **Recommended** for large files — one JSON object per line, streamed |
| `.json` (array)      | Supported via `stream-json` on the worker — higher CPU than NDJSON   |

Export is always **gzip JSON Lines** (`.jsonl.gz`) with Mongo-shaped fields (see `docs/khanan_sample_5000.json`).

## Disk

- Import chunks and assembled files: `KHANAN_IMPORT_DIR` (default `/var/lib/vahanplus/imports`)
- Export output: `KHANAN_EXPORT_DIR` (default `/var/lib/vahanplus/exports`)
- Plan for **2× file size** during import (chunks + assembled file) until the job completes
- A **15GB** NDJSON file needs ~30GB free on the volume during import

## Convert JSON array to JSON Lines

```bash
jq -c '.[]' huge.json > huge.jsonl
```

Optional compression for storage only (worker reads plain `.jsonl`):

```bash
gzip -k huge.jsonl
# gunzip before import, or import the uncompressed .jsonl
```

## Web UI

`/khanan/import`:

- **Small JSON array** (under ~8MB, ≤10k rows): in-browser parse + commit
- **Large / JSON Lines**: chunked upload → BullMQ `khanan_bulk_import` worker
- **Export**: date filters → async job → download `.jsonl.gz`

### Multi-date Mongo exports

Many historical exports put a different **`date`** (report date) on each row. Import ETL creates **one `EpassSnapshot` per distinct report date** (`sourceUrl: import`), not one giant snapshot for the whole file.

| Effect                               | What operators see                                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| After import                         | Pass count ≈ row count; snapshot count ≈ distinct dates in file                                                                                                        |
| Consigner / challan browse (default) | **One snapshot** (usually latest `scrapedAt`) — often only **1–2 consigners** if that day had few rows                                                                 |
| See full import                      | Use **Date range** on Consigner (or pick a busier report date). Post-import success links **Browse date range** when analyze stored `dateFrom` / `dateTo` on the batch |

**Duplicate VRN warnings** count plates that appear on more than one row (multiple challans/dates). They are **not** duplicate challan lines and do not block import.

Pre-import review shows an info alert when the file spans **>10** report dates.

## Verify import in Postgres

After a large import completes:

```sql
-- latest batch
SELECT id, status, "passesImported", "rowsProcessed", options
FROM ingest."KhananImportBatch"
ORDER BY "createdAt" DESC
LIMIT 1;

SELECT COUNT(*) AS import_snapshots
FROM processed."EpassSnapshot"
WHERE "sourceUrl" = 'import';

SELECT COUNT(*) AS import_pass_rows
FROM processed."EpassChallanPassRow" p
JOIN processed."EpassChallanRow" c ON c.id = p."challanRowId"
JOIN processed."EpassConsignerRow" g ON g.id = c."consignerRowId"
JOIN processed."EpassDistrictRow" d ON d.id = g."districtRowId"
JOIN processed."EpassSnapshot" s ON s.id = d."snapshotId"
WHERE s."sourceUrl" = 'import';
```

For `docs/khanan_sample_5000.json` (~5000 rows, ~1869 dates): expect ~1869 import snapshots and ~5000 pass rows when status is `completed`.

## API

| Method | Path                                      | Purpose                   |
| ------ | ----------------------------------------- | ------------------------- |
| POST   | `/epass/import/batches`                   | Create batch              |
| PUT    | `/epass/import/batches/:id/chunks/:index` | Raw binary chunk (≤32MB)  |
| POST   | `/epass/import/batches/:id/complete`      | Assemble + enqueue worker |
| GET    | `/epass/import/batches/:id`               | Progress                  |
| POST   | `/epass/import/export/khanan-passes`      | Start export              |
| GET    | `/epass/import/export/jobs/:id/download`  | Download when `completed` |

Ingress `proxy-body-size` should be **≥32m** per chunk.

## CLI (ops / first 15GB test)

From `apps/api-express` with env loaded:

```bash
node scripts/khanan-bulk-import.js --file /data/khanan_15gb.jsonl --replace-existing
```

Same streaming ETL as the worker; no browser upload.

## Worker

Job types: `khanan_bulk_import`, `khanan_bulk_export` on the scrape queue. Import concurrency should stay **1** for heavy files to protect Postgres and portal fanout.

## Package

Shared logic: `@vahanplus/khanan-import` (normalize, ETL session, storage, stream parse).
