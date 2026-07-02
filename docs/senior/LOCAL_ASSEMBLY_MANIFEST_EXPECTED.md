# LOCAL_ASSEMBLY_MANIFEST_EXPECTED v1.0.3

Purpose: provide LOCAL-ASSEMBLY-01 with the executable module output packages available from Senior-reviewed Engineering Worker outputs, plus expanded copies for convenience.

Gate invariant: this is **local assembly input only**. It is not a production merge, not a GitHub repo, and not P1/P2 scope.

| Module | Package file/folder name | Contains source code | Contains migration | Contains seed | Contains test | Depends on | Expected apply order | Known conflicts | Senior approval status |
|---|---|---:|---:|---:|---:|---|---:|---|---|
| EW-01 Core Accounting / GL Foundation | `packages/EW-01_TARGETED_REVISION_ROUND3_HOTFIX_v2_1.zip` + `expanded/EW-01_core_accounting_gl_foundation/` | yes | yes | no | yes | none; base schema must apply first | 1 | none after Round 3 hotfix; canonical accounts.id/account_id and goods_received_not_invoiced accepted | PASS FOR INTEGRATION |
| EW-06 VAT Ledger Baseline | `packages/EW-06_TARGETED_REVISION_READY.zip` + `expanded/EW-06_vat_ledger_baseline/` | yes | yes | no | yes | EW-01 accounts/company context; sales/purchase later write VAT entries | 2 | integration hold until sales/purchase wiring smoke passes | PASS WITH INTEGRATION HOLD |
| EW-02 v1.3 AR/AP Ledger + Allocation | `packages/EW-02_AR_AP_ROUTE_TS2322_HOTFIX_v1_3.zip` + `expanded/EW-02_ar_ap_ledger_allocation_v1_3/` | yes | yes | no | yes | EW-01 transaction boundary and account/company context | 3 | TS2322 route blocker resolved in v1.3; no schema/semantic changes expected | PASS FOR FINAL INTEGRATION RERUN |
| EW-05 v1.1 Inventory Moving Average Baseline | `packages/EW-05_MERGEABLE_INVENTORY_IMPLEMENTATION_P0_v1_1.zip` + `expanded/EW-05_inventory_moving_average_v1_1/` | yes | yes | no | yes | EW-01 postAccountingDocument(request, tx); MD-01 items/warehouses for smoke data | 4 | contract alignment resolved; requires DB smoke with MD-01 and sales/purchase | PASS FOR INTEGRATION |
| EW-03 Sales / Delivery Baseline | `packages/EW-03_REVISION_PATCH_v1_2.zip` + `expanded/EW-03_sales_delivery_baseline/` | yes | yes | no | yes | EW-01 GL posting contract; EW-02 AR/AP; EW-05 inventory; EW-06 VAT; MD-01 customers/items/warehouses | 5 | held until DB-backed end-to-end sales/delivery smoke | PASS WITH INTEGRATION HOLD |
| EW-04 Purchase / GRNI Baseline | `packages/EW-04_ROUND3_HOTFIX_COMPLETE_v1_0.zip` + `expanded/EW-04_purchase_grni_baseline/` | yes | yes | no | yes | EW-01 account_mappings/account resolver; EW-02 AP; EW-05 inventory; EW-06 VAT; MD-01 suppliers/items/warehouses | 6 | Round 3 blocker resolved; must smoke GRNI clearing and direct purchase-invoice stock update | PASS FOR INTEGRATION |
| MD-01 Master Data Baseline | `packages/MD-01_MASTER_DATA_BASELINE_P0_v1_0.zip` + `expanded/MD-01_master_data_baseline/` | yes | yes | yes | validation SQL only | EW-01 company/accounts context for item account mappings where applicable | 7 | seed requires real PostgreSQL DATABASE_URL; previous sandbox failed only because PostgreSQL unavailable | PASS WITH INTEGRATION HOLD / ENV-BLOCKED |
| INT-01 Unified Integration Harness | `packages/INT-01_COMPLETED.zip` + `expanded/INT-01_unified_integration_harness/` | no executable source; harness document/reports only | no | no | smoke-test plan/report artifacts | all modules + real PostgreSQL DATABASE_URL | 8 | current uploaded INT-01 artifact is harness documentation/report package, not a runnable test runner; LOCAL-ASSEMBLY-01 must implement/run the commands described there or provide executable harness | ACCEPTED AS PROCESS HARNESS / WAITING FOR LOCAL DB-BACKED RUN |
| Final Integration Rerun Bundle v1.0.3 | `packages/FINAL_INTEGRATION_RERUN_INPUTS_v1_0_3_WITH_EW02_V1_3.zip` + `expanded/FINAL_INTEGRATION_RERUN_INPUTS_v1_0_3_WITH_EW02_V1_3/` | yes, nested packages | yes, nested packages | yes, nested MD-01 package | yes, nested packages | same-runtime PostgreSQL on local machine | 9 | not production; previous gate stopped due missing PostgreSQL only after module package checks passed | ACCEPTED RERUN INPUT BUNDLE |

## Important Senior Notes

- The module packages are the latest accepted source-output zips available in the project workspace.
- `INT-01_COMPLETED.zip` contains integration harness documentation/report artifacts, not a standalone executable runner script. LOCAL-ASSEMBLY-01 should use it as the gate procedure unless/until an executable harness package is produced.
- Do not merge production after local assembly alone. Production acceptance still requires ordered migrations, MD-01 seed, DB-backed cross-module smoke tests, and Senior Final Merge Gate.
- P1/P2 features remain blocked: FIFO, landed cost, manufacturing, serial/batch, repost valuation, advanced warehouse flows.
