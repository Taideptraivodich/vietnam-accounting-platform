# Final Integration Rerun Input Manifest v1.0.3

## Purpose

Rerun Final Integration Gate v1.0.3 after EW-02 TS2322 hotfix v1.3 was accepted.

## Required Files
- `FINAL_INTEGRATION_GATE_v1_0_PACKAGE.zip` — 7251 bytes — sha256 `f495b5795e5c0c863070da50bab41f7e922df43f7e84f0c904007b7768250009`
- `EW-01_TARGETED_REVISION_ROUND3_HOTFIX_v2_1.zip` — 42390 bytes — sha256 `0e20af47d1418fb6a7f7f52f5702b7dda610cde26ea49b402ea25e0f6ac58698`
- `EW-06_TARGETED_REVISION_READY.zip` — 25585 bytes — sha256 `89b4baf1f72030d49cbad0644a76ac338e497ad037f3d780da1c58c420b628a3`
- `EW-02_AR_AP_ROUTE_TS2322_HOTFIX_v1_3.zip` — 83933 bytes — sha256 `44848e588359f603db2937c041828551e0654bde415c3cfb6313617c85daba22`
- `MD-01_MASTER_DATA_BASELINE_P0_v1_0.zip` — 10649 bytes — sha256 `eaa92b63a237f323a048411bea4c560eea6970addb47bf6e9586e0279c14ea65`
- `EW-05_MERGEABLE_INVENTORY_IMPLEMENTATION_P0_v1_1.zip` — 31016 bytes — sha256 `76f3c5bdc81c8a32607454ef762c6cf1f618bb74a40e201161afecefea24bfac`
- `EW-03_REVISION_PATCH_v1_2.zip` — 35361 bytes — sha256 `0ef2bb04c3b1e14cf6d02fbd6bdf4e449e3564566e3077238c4418d238e62379`
- `EW-04_ROUND3_HOTFIX_COMPLETE_v1_0.zip` — 31577 bytes — sha256 `abac43474633871c6603c4bb0114d5d5649f97de8ecacc361092273decd259dc`
- `INT-01_COMPLETED.zip` — 20488 bytes — sha256 `315094b4df2123242e84bfbc9c8b2bfd6ee6281c22d23f25575aa61fb45bbf88`

## Required Environment

```text
DATABASE_URL must be exported and point to a disposable PostgreSQL database.
Do not skip MD-01 seed.
Do not merge production if any build/migration/smoke test fails.
```

## Assembly Order

```text
1. EW-01 Core Accounting / GL
2. EW-06 VAT ledger
3. EW-02 AR/AP v1.3 hotfix
4. MD-01 Master Data baseline
5. EW-05 Inventory v1.1
6. EW-03 Sales / Delivery
7. EW-04 Purchase / GRNI
8. INT-01 unified integration harness
9. Cross-module smoke test
10. Final merge recommendation
```