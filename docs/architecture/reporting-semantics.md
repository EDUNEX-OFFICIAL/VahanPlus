# ePass reporting semantics (CQRS read model)

Approved stakeholder rules (2026-06-07).

## Scope dimensions

| Scope                 | Meaning                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **All Reports**       | Latest state per entity across full history                                                                       |
| **Specific snapshot** | Raw immutable rows for one `snapshotId` (audit)                                                                   |
| **Date range**        | Among snapshots with `reportDate` in `[from, to]`, latest-wins-per-reportDate then latest-per-entity within range |

## Winner function

```
candidate wins over incumbent when:
  compareReportDates(candidate.reportDate, incumbent.reportDate) > 0
  OR same reportDate AND candidate.scrapedAt > incumbent.scrapedAt
```

Implemented in `@vahanplus/report-aggregator` (`semantics.js`). APIs must not reimplement.

## Per-report entity keys

### District

- **Key:** `normalizeDmoKey(dmoName)` → lowercase trim
- **Source:** `EpassDistrictRow`
- **Read table:** `ReportDistrictSummary`

### Mineral

- **Key:** `mineralLabel|operatorRole` (`lessee` | `dealer`)
- **Derivation:** Project from each winning district row's `lesseeMineral` / `dealerMineral`
- **Aggregation:** `SUM` metrics from all `ReportDistrictSummary` rows grouped by mineral key (each DMO contributes once via its latest row)
- **Read table:** `ReportMineralSummary`

### Consigner

- **Key:** `dmoName|operatorType|consignerName` (lowercase)
- **No cross-snapshot challan sum** — winning row's counts only
- **Read table:** `ReportConsignerSummary`

### Consignee (challan line)

- **Key:** `consignerEntityKey|consigneeName|mineral|slNo`
- **Source:** `EpassChallanRow`
- **Read table:** `ReportConsigneeSummary`

### Challan pass

- **Key:** pass fingerprint (reportDate, challanNo, VRN, transport date, destination, qty, unit, mineral, checkStatus, consignee)
- **Read table:** `ReportChallanPassSummary`

### Vehicle data

- **Key:** `vehicleRegNo`
- **Passes:** dedupe by pass fingerprint first; aggregate surviving passes per VRN
- **Read table:** `ReportVehiclePassSummary`

## Golden test vectors

See [`packages/report-aggregator/test/golden/vectors.json`](../../packages/report-aggregator/test/golden/vectors.json).

Run: `pnpm --filter @vahanplus/report-aggregator test`

## Invariants

1. Reporting routes never load multiple snapshots at request time (post Phase 4).
2. Summary tables updated only by `report_aggregate` worker jobs.
3. Raw snapshot tables remain append-only audit source.
