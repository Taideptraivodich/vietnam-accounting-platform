# LOCAL_ASSEMBLY_MANIFEST.md

Checksum status: `sha256sum -c CHECKSUMS.sha256` completed successfully for all listed top-level input files/packages.

| Module | Package name | Contains source code | Contains migration | Contains seed | Contains test | Contains executable runner | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| EW-01 Core Accounting / GL Foundation | EW-01_TARGETED_REVISION_ROUND3_HOTFIX_v2_1.zip | yes | yes | no | yes | yes | Source under `src/`; migration `001_gl_foundation.sql`; no package.json, but `tests/run_unit_tests.js` is executable by Node. |
| EW-06 VAT Ledger Baseline | EW-06_TARGETED_REVISION_READY.zip | yes | yes | no | yes | yes | Source under `src/`; migration `0001_create_tax_ledger_entries.sql`; package test script uses `node --test`. |
| EW-02 AR/AP Ledger + Allocation v1.3 | EW-02_AR_AP_ROUTE_TS2322_HOTFIX_v1_3.zip | yes | yes | no | yes | yes | TypeScript source, migration, Jest tests, `verify` script. TS2322 hotfix package is the selected v1.3 artifact. |
| EW-05 Inventory Moving Average Baseline v1.1 | EW-05_MERGEABLE_INVENTORY_IMPLEMENTATION_P0_v1_1.zip | yes | yes | no | yes | yes | Source under `src/modules/inventory`; migration references `items` and `warehouses`, so DB migration order places MD-01 schema before EW-05. |
| EW-03 Sales / Delivery Baseline | EW-03_REVISION_PATCH_v1_2.zip | yes | yes | no | yes | yes | Source under `src/sales`; node test artifact present. |
| EW-04 Purchase / GRNI Baseline | EW-04_ROUND3_HOTFIX_COMPLETE_v1_0.zip | yes | yes | no | yes | yes | Source under `src/modules/purchase`; migration and node tests present. |
| MD-01 Master Data Baseline | MD-01_MASTER_DATA_BASELINE_P0_v1_0.zip | yes | yes | yes | yes, validation SQL only | yes, seed runner | Contains real seed data `master_data_baseline.seed.json` and executable seeder `seed_master_data_baseline.js`; requires real PostgreSQL and existing company/accounts IDs. |
| INT-01 Unified Integration Harness | INT-01_COMPLETED.zip | no business source | no | no | yes, harness/spec/report artifacts only | no | Contains `INTEGRATION_HARNESS.md`, reports, and open issues. No executable cross-module smoke runner is present. |
| Final Integration Rerun Bundle | FINAL_INTEGRATION_RERUN_INPUTS_v1_0_3_WITH_EW02_V1_3.zip | nested packages | nested packages | nested MD-01 package | nested packages | nested/unspecified | Retained under raw extraction for evidence only; not separately applied because canonical module packages above were assembled directly. |

Inventory conclusion: all EW packages contain real source, migration, and tests; MD-01 contains real migration, seed data, seed runner, and validation SQL; INT-01 contains procedure/report artifacts only, not an executable runner.
