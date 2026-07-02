# LOCAL_ASSEMBLY_SEQUENCE.md

## Actual source apply order

1. EW-01 — Core Accounting / GL Foundation — `EW-01_TARGETED_REVISION_ROUND3_HOTFIX_v2_1.zip`
2. EW-06 — VAT Ledger Baseline — `EW-06_TARGETED_REVISION_READY.zip`
3. EW-02 — AR/AP Ledger + Allocation v1.3 — `EW-02_AR_AP_ROUTE_TS2322_HOTFIX_v1_3.zip`
4. EW-05 — Inventory Moving Average Baseline v1.1 — `EW-05_MERGEABLE_INVENTORY_IMPLEMENTATION_P0_v1_1.zip`
5. EW-03 — Sales / Delivery Baseline — `EW-03_REVISION_PATCH_v1_2.zip`
6. EW-04 — Purchase / GRNI Baseline — `EW-04_ROUND3_HOTFIX_COMPLETE_v1_0.zip`
7. MD-01 — Master Data Baseline — `MD-01_MASTER_DATA_BASELINE_P0_v1_0.zip`
8. INT-01 — Unified Integration Harness / Procedure — `INT-01_COMPLETED.zip`

## Files/folders copied

- `EW-01: src/app.js -> src/app.js`
- `EW-01: src/repositories/AccountRepository.js -> src/repositories/AccountRepository.js`
- `EW-01: src/repositories/FiscalPeriodRepository.js -> src/repositories/FiscalPeriodRepository.js`
- `EW-01: src/repositories/JournalEntryRepository.js -> src/repositories/JournalEntryRepository.js`
- `EW-01: src/repositories/GlEntryRepository.js -> src/repositories/GlEntryRepository.js`
- `EW-01: src/services/PostingService.js -> src/services/PostingService.js`
- `EW-01: src/validators/PostingValidator.js -> src/validators/PostingValidator.js`
- `EW-01: src/routes/gl.js -> src/routes/gl.js`
- `EW-01: src/utils/UnitOfWork.js -> src/utils/UnitOfWork.js`
- `EW-06: src/taxLedgerService.js -> src/taxLedgerService.js`
- `EW-06: src/taxLedgerRepository.pg.js -> src/taxLedgerRepository.pg.js`
- `EW-06: src/taxLedgerRepository.contract.js -> src/taxLedgerRepository.contract.js`
- `EW-06: src/taxLedgerRoutes.js -> src/taxLedgerRoutes.js`
- `EW-02: src/types/ar-ap.types.ts -> src/types/ar-ap.types.ts`
- `EW-02: src/repositories/ar-ap-ledger.repository.ts -> src/repositories/ar-ap-ledger.repository.ts`
- `EW-02: src/repositories/ar-ap-allocation.repository.ts -> src/repositories/ar-ap-allocation.repository.ts`
- `EW-02: src/repositories/outstanding-cache.repository.ts -> src/repositories/outstanding-cache.repository.ts`
- `EW-02: src/services/ar-ap.service.ts -> src/services/ar-ap.service.ts`
- `EW-02: src/routes/ar-ap.routes.ts -> src/routes/ar-ap.routes.ts`
- `EW-05: src/modules/inventory/services/InventoryService.js -> src/modules/inventory/services/InventoryService.js`
- `EW-05: src/modules/inventory/repositories/InMemoryInventoryRepository.js -> src/modules/inventory/repositories/InMemoryInventoryRepository.js`
- `EW-05: src/modules/inventory/repositories/PostgresInventoryRepository.js -> src/modules/inventory/repositories/PostgresInventoryRepository.js`
- `EW-03: src/sales/constants.js -> src/sales/constants.js`
- `EW-03: src/sales/index.js -> src/sales/index.js`
- `EW-03: src/sales/models/SalesInvoice.js -> src/sales/models/SalesInvoice.js`
- `EW-03: src/sales/models/DeliveryNote.js -> src/sales/models/DeliveryNote.js`
- `EW-03: src/sales/services/AccountContractResolver.js -> src/sales/services/AccountContractResolver.js`
- `EW-03: src/sales/services/SalesInvoiceService.js -> src/sales/services/SalesInvoiceService.js`
- `EW-03: src/sales/services/DeliveryNoteService.js -> src/sales/services/DeliveryNoteService.js`
- `EW-03: src/sales/services/SalesPostingService.js -> src/sales/services/SalesPostingService.js`
- `EW-03: src/sales/services/inMemoryRepositories.js -> src/sales/services/inMemoryRepositories.js`
- `EW-03: src/sales/routes/salesInvoiceRoutes.js -> src/sales/routes/salesInvoiceRoutes.js`
- `EW-03: src/sales/routes/deliveryNoteRoutes.js -> src/sales/routes/deliveryNoteRoutes.js`
- `EW-04: src/modules/purchase/services/purchase-receipt.service.js -> src/modules/purchase/services/purchase-receipt.service.js`
- `EW-04: src/modules/purchase/services/grni-metadata.service.js -> src/modules/purchase/services/grni-metadata.service.js`
- `EW-04: src/modules/purchase/services/purchase-account-resolver.service.js -> src/modules/purchase/services/purchase-account-resolver.service.js`
- `EW-04: src/modules/purchase/services/purchase-invoice.service.js -> src/modules/purchase/services/purchase-invoice.service.js`
- `EW-04: src/modules/purchase/validators/purchase.validators.js -> src/modules/purchase/validators/purchase.validators.js`
- `EW-04: src/modules/purchase/controllers/purchase.controller.js -> src/modules/purchase/controllers/purchase.controller.js`
- `EW-01: tests/helpers.js -> tests/helpers.js`
- `EW-01: tests/run_unit_tests.js -> tests/run_unit_tests.js`
- `EW-06: test/fakeRepository.js -> test/fakeRepository.js`
- `EW-06: test/taxLedgerService.test.js -> test/taxLedgerService.test.js`
- `EW-02: tests/ar-ap.service.test.ts -> tests/ar-ap.service.test.ts`
- `EW-02: tests/ar-ap.routes.test.ts -> tests/ar-ap.routes.test.ts`
- `EW-05: tests/inventory_service.test.js -> tests/inventory_service.test.js`
- `EW-05: tests/migration_contract.test.js -> tests/migration_contract.test.js`
- `EW-05: tests/verify_package.js -> tests/verify_package.js`
- `EW-05: tests/accounting_contract.test.js -> tests/accounting_contract.test.js`
- `EW-03: tests/salesPostingService.test.js -> tests/salesPostingService.test.js`
- `EW-04: tests/purchase-invoice.service.test.js -> tests/purchase-invoice.service.test.js`
- `EW-04: tests/validators.test.js -> tests/validators.test.js`
- `EW-04: tests/purchase-account-resolver.service.test.js -> tests/purchase-account-resolver.service.test.js`
- `MIGRATION: expanded/EW-01_core_accounting_gl_foundation/ew01_revised/migrations/001_gl_foundation.sql -> migrations/001_EW-01_gl_foundation.sql`
- `MIGRATION: expanded/EW-06_vat_ledger_baseline/ew6_revision_output/migrations/0001_create_tax_ledger_entries.sql -> migrations/002_EW-06_vat_ledger.sql`
- `MIGRATION: expanded/EW-02_ar_ap_ledger_allocation_v1_3/migrations/001_ar_ap_ledger_and_allocations.sql -> migrations/003_EW-02_ar_ap_ledger_allocations.sql`
- `MIGRATION: expanded/MD-01_master_data_baseline/MD-01_MASTER_DATA_BASELINE_P0_v1_0/migrations/001_md01_master_data_baseline.sql -> migrations/004_MD-01_master_data_schema.sql`
- `MIGRATION: expanded/EW-05_inventory_moving_average_v1_1/EW-05_MERGEABLE_INVENTORY_IMPLEMENTATION_P0_v1_1/migrations/001_inventory_mergeable_v1_1.sql -> migrations/005_EW-05_inventory_moving_average.sql`
- `MIGRATION: expanded/EW-03_sales_delivery_baseline/EW-03_REVISION_PATCH_v1_2/migrations/001_sales_delivery_baseline.sql -> migrations/006_EW-03_sales_delivery.sql`
- `MIGRATION: expanded/EW-04_purchase_grni_baseline/ew04_round3_complete/migrations/001_purchase_grni_baseline.sql -> migrations/007_EW-04_purchase_grni.sql`
- `MD-01: seeders -> seeds/seeders`
- `MD-01: seed_data -> seeds/seed_data`
- `MD-01: validation -> seeds/validation`
- `INT-01: CROSS_MODULE_SMOKE_TEST_RESULT(3).md -> integration/INT-01/CROSS_MODULE_SMOKE_TEST_RESULT(3).md`
- `INT-01: FINAL_INTEGRATION_GATE_v1_0_2_REPORTS.sha256 -> integration/INT-01/FINAL_INTEGRATION_GATE_v1_0_2_REPORTS.sha256`
- `INT-01: FINAL_INTEGRATION_GATE_v1_0_2_REPORTS.zip -> integration/INT-01/FINAL_INTEGRATION_GATE_v1_0_2_REPORTS.zip`
- `INT-01: FINAL_RECOMMENDATION.md -> integration/INT-01/FINAL_RECOMMENDATION.md`
- `INT-01: INTEGRATION_HARNESS.md -> integration/INT-01/INTEGRATION_HARNESS.md`
- `INT-01: OPEN_ISSUES.md -> integration/INT-01/OPEN_ISSUES.md`

## Patch/diff applied

- None. No business rule, API contract, or schema patch was applied outside approved package files.
- No import path rewrite was required for merged `src/` compatibility layout.

## Script run

- Ran `scripts/prepare_local_candidate_worktree.sh /mnt/data/local_candidate_v1_0_3/raw_package_extract`.
- Result kept under `raw_package_extract/modules/` for raw package audit.

## Migration order for local DB execution

1. `001_EW-01_gl_foundation.sql`
2. `002_EW-06_vat_ledger.sql`
3. `003_EW-02_ar_ap_ledger_allocations.sql`
4. `004_MD-01_master_data_schema.sql`
5. `005_EW-05_inventory_moving_average.sql`
6. `006_EW-03_sales_delivery.sql`
7. `007_EW-04_purchase_grni.sql`
8. `MD-01 seed` via `scripts/run_md01_seed.sh` after migrations and after required company/account IDs exist.

Note: source package assembly followed the Senior/user order exactly. DB migration execution places MD-01 schema before EW-05 because `001_inventory_mergeable_v1_1.sql` has foreign keys to `items(id)` and `warehouses(id)`, matching `docs/LOCAL_ASSEMBLY_ORDER_v1_0_3.md`.
