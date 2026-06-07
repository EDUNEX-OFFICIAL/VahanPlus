# Khanan import — page matrix and edge cases

Central hub: **`/khanan/import`** → `POST /epass/import/analyze` and `POST /epass/import/commit`.

**Supported file formats:** `.csv`, `.xlsx`, `.xls` (first worksheet only for Excel). Parsed in the browser; max **10,000** data rows per commit. Commit payload limit **15mb** on API.

## Where import belongs

| Page               | Import?             | Priority  | With registration (VRN)         | Without VRN                                      |
| ------------------ | ------------------- | --------- | ------------------------------- | ------------------------------------------------ |
| **Import Data**    | Yes                 | P0 (live) | `vehicle_status`, `khanan_pass` | `district_snapshot`                              |
| **District**       | Optional shortcut   | P2        | N/A                             | District CSV + report date                       |
| **Vehicle Status** | Optional shortcut   | P2        | MCV columns                     | Reject / warn                                    |
| **Vehicle Data**   | No direct import    | —         | Weights from status rows        | Cannot aggregate passes without VRN              |
| **Consigner**      | Ghat bulk (planned) | P1        | N/A                             | `consignerName`, `dmo`, `operator`, `ghatNumber` |
| **Consignee**      | No                  | —         | —                               | —                                                |
| **Challan**        | Defer               | P3        | `challanNo` + VRN               | High duplicate / wrong-snapshot risk             |
| **Khanan Config**  | No                  | —         | —                               | —                                                |

## Live import types

### `district_snapshot`

- Detected when district column score ≥ 3.
- **Requires:** `dmoName` (aliases: district, DMO).
- **Optional:** lessee/dealer mineral, users, passes, qty columns.
- **Requires** `reportDate` on commit (UI default: today; server validates `YYYY-MM-DD`).
- Creates new `epassSnapshot` + `epassDistrictRow` rows (`sourceUrl: import`).
- Commit fails if no row has a non-blank DMO/district name.

### `khanan_pass`

- Detected when pass export columns map (before bare `vehicle_status`).
- **Requires:** `vehicleRegNo`, `district`, `consignerName`, `challanNo`, `date` (camelCase or aliases in [`khanan-import-template.csv`](khanan-import-template.csv)).
- **Optional:** `sourceType` (Lessee/Dealer), `consigneeName`, `destination`, `quantity`, `unit`, `checkStatus`, minerals, `transportedDate`.
- **Snapshot:** one `epassSnapshot` per distinct parsed `date` (`reportDate` ISO); `sourceUrl: import`, `reportGeneratedOn: import-<batch>`.
- **Hierarchy:** district → consigner → challan → pass (VRN normalized on pass).
- **Post-commit:** enqueues `bihar_mcv_vehicle_status` for distinct VRNs (missing only by default).
- **Options on commit:** `replaceExisting` (delete prior import snapshots for same report dates), `refreshVehicleStatus` (queue all VRNs).
- **Weights:** not imported from file; GVW/unladen come from MCV scrape into `epassVehicleStatusRow`.
- Analyze returns `distinctDates` / `distinctVrns` when client sends `statsRows` (full file).

### `vehicle_status`

- Detected when `vehicleRegNo` column maps and pass columns are absent.
- **Requires:** VRN column (aliases: vrn, registration).
- **Optional:** gross/unladen weight, fitness, tax, insurance, PUCC, IMEI, etc.
- Upserts `epassVehicleStatusRow` by normalized VRN (`normalizeVehicleRegNo`: uppercase, no spaces).
- Response includes `skipped` count for blank VRN rows.

## Edge cases (implemented)

1. **Blank VRN** — Skip row; never upsert empty VRN; counted in `skipped`.
2. **VRN normalization** — `normalizeVehicleRegNo` from `@vahanplus/scraper-bihar-epass` on commit.
3. **Duplicate VRN in one file** — Last row wins; UI shows analyze warning with duplicate VRN count.
4. **Unknown VRN** — Upsert new status row (current behavior).
5. **Vehicle file without VRN column** — Analyze error; district only if district score ≥ 3.
6. **Ambiguous headers** — Warning when district score ≥ 3 and vehicle score ≥ 2; district wins if `districtScore >= vehicleScore`.
7. **District import same report date** — Default: new snapshot per commit (document operator choice if merge is added).
8. **Ghat bulk (no VRN)** — _Not implemented_ — see planned Consigner import below.
9. **Optional `found=false`** — Metadata-only updates on status rows; does not create pass rows.
10. **Row cap** — 10,000 rows per commit (client + server); analyze uses `totalRowCount` from UI.
11. **Post-import** — Invalidate `['epass']` and snapshot queries (import page).
12. **UTF-8 BOM** — Stripped from first header (CSV + Excel).
13. **Large import bodies** — `POST /epass/import/analyze` and `/commit` use 15mb JSON limit; ingress allows 20mb. Analyze sends only headers + 5 sample rows; full-file khanan stats are computed in the browser.

## Challan / pass import

Use **`khanan_pass`** on Import Data for Khanan Mongo/CSV exports. Template: [`khanan-import-template.csv`](khanan-import-template.csv). Sample shape: [`docs/khanan_sample_5000.json`](../khanan_sample_5000.json).

## Related code

- Service: [`apps/api-express/src/services/epassImport.js`](../../apps/api-express/src/services/epassImport.js)
- Routes: [`apps/api-express/src/routes/epassImport.js`](../../apps/api-express/src/routes/epassImport.js)
- Client parse: [`apps/web/src/lib/spreadsheet-parse.ts`](../../apps/web/src/lib/spreadsheet-parse.ts)
- UI: [`apps/web/src/app/(dashboard)/khanan/import/page.tsx`](<../../apps/web/src/app/(dashboard)/khanan/import/page.tsx>)
