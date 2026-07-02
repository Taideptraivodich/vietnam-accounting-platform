# LOCAL_SOURCE_TREE_REPORT.md

Candidate root: `/mnt/data/local_candidate_v1_0_3`

## Required top-level inventory

- `package.json` — present
- `src/` — present; merged compatibility source root
- `backend/source/` — present; required backend source folder mirror
- `migrations/` — present; ordered SQL files plus `MIGRATION_ORDER.txt`
- `seeds/` — present; MD-01 seed data, seeder, validation SQL
- `tests/` and `test/` — present; module test artifacts
- `integration/INT-01/` — present; harness procedure/report artifacts
- `.env.integration.example` — present
- `README_LOCAL_RUN.md` — present

## Tree snapshot

```text
.env.integration.example
LOCAL_ASSEMBLY_MANIFEST.md
LOCAL_ASSEMBLY_OPEN_ISSUES.md
LOCAL_ASSEMBLY_READY_FOR_ENV_INT.md
LOCAL_ASSEMBLY_SEQUENCE.md
README_LOCAL_RUN.md
backend/
backend/source/
backend/source/app.js
backend/source/modules/
backend/source/modules/inventory/
backend/source/modules/purchase/
backend/source/repositories/
backend/source/repositories/AccountRepository.js
backend/source/repositories/FiscalPeriodRepository.js
backend/source/repositories/GlEntryRepository.js
backend/source/repositories/JournalEntryRepository.js
backend/source/repositories/ar-ap-allocation.repository.ts
backend/source/repositories/ar-ap-ledger.repository.ts
backend/source/repositories/outstanding-cache.repository.ts
backend/source/routes/
backend/source/routes/ar-ap.routes.ts
backend/source/routes/gl.js
backend/source/sales/
backend/source/sales/constants.js
backend/source/sales/index.js
backend/source/sales/models/
backend/source/sales/routes/
backend/source/sales/services/
backend/source/services/
backend/source/services/PostingService.js
backend/source/services/ar-ap.service.ts
backend/source/taxLedgerRepository.contract.js
backend/source/taxLedgerRepository.pg.js
backend/source/taxLedgerRoutes.js
backend/source/taxLedgerService.js
backend/source/types/
backend/source/types/ar-ap.types.ts
backend/source/utils/
backend/source/utils/UnitOfWork.js
backend/source/validators/
backend/source/validators/PostingValidator.js
docs/
docs/modules/
docs/modules/EW-01/
docs/modules/EW-01/ACCOUNT_RESOLVER_CONTRACT_EW01_v1_0.md
docs/modules/EW-01/APPEND_ONLY_ENFORCEMENT_EVIDENCE.md
docs/modules/EW-01/CHANGED_FILES.md
docs/modules/EW-01/CONTRACT_ALIGNMENT_NOTES.md
docs/modules/EW-01/CORE_ACCOUNTING_CONTRACT_v1_0.md
docs/modules/EW-01/DATABASE_CONTRACT_EW01_v1_0.md
docs/modules/EW-01/MIGRATION_NOTES.md
docs/modules/EW-01/OPEN_QUESTIONS.md
docs/modules/EW-01/OPEN_QUESTIONS_EW01.md
docs/modules/EW-01/README.md
docs/modules/EW-01/REVISION_SUMMARY_EW01.md
docs/modules/EW-01/REVISION_SUMMARY_EW01_ROUND2.md
docs/modules/EW-01/REVISION_SUMMARY_EW01_ROUND3_HOTFIX.md
docs/modules/EW-01/TEST_EVIDENCE.md
docs/modules/EW-01/TEST_EVIDENCE_EW01.md
docs/modules/EW-01/TRANSACTION_BOUNDARY_CONTRACT_v1_0.md
docs/modules/EW-02/
docs/modules/EW-02/README.md
docs/modules/EW-02/docs/
docs/modules/EW-02/package.json
docs/modules/EW-02/tsconfig.json
docs/modules/EW-03/
docs/modules/EW-03/CHANGED_FILES.md
docs/modules/EW-03/CONTRACT_ALIGNMENT_NOTES.md
docs/modules/EW-03/CONTRACT_ALIGNMENT_NOTES_EW03.md
docs/modules/EW-03/MIGRATION_NOTES.md
docs/modules/EW-03/OPEN_QUESTIONS.md
docs/modules/EW-03/OPEN_QUESTIONS_EW03.md
docs/modules/EW-03/REVISION_SUMMARY.md
docs/modules/EW-03/REVISION_SUMMARY_EW03.md
docs/modules/EW-03/ROUND2_REVISION_NOTES_EW03.md
docs/modules/EW-03/SALES_CANCEL_REVERSAL_EVIDENCE.md
docs/modules/EW-03/SALES_IMPLEMENTATION_FILE_LIST.md
docs/modules/EW-03/SALES_POSTING_FLOW_EVIDENCE.md
docs/modules/EW-03/TEST_EVIDENCE.md
docs/modules/EW-03/TEST_EVIDENCE_EW03.md
docs/modules/EW-03/package.json
docs/modules/EW-04/
docs/modules/EW-04/README.md
docs/modules/EW-04/docs/
docs/modules/EW-04/package.json
docs/modules/EW-05/
docs/modules/EW-05/ACCOUNTING_ENGINE_INTEGRATION_EW05_v1_1.md
docs/modules/EW-05/DATABASE_CONTRACT_EW05_v1_1.md
docs/modules/EW-05/IMPLEMENTATION_SUMMARY.md
docs/modules/EW-05/INVENTORY_LEDGER_SCHEMA_PATCH.sql
docs/modules/EW-05/MIGRATION_ORDER.md
docs/modules/EW-05/OPEN_ISSUES.md
docs/modules/EW-05/README.md
docs/modules/EW-05/TEST_EVIDENCE.md
docs/modules/EW-05/TEST_EVIDENCE_EW05_v1_1.md
docs/modules/EW-05/package.json
docs/modules/EW-06/
docs/modules/EW-06/CHANGED_FILES.md
docs/modules/EW-06/CONTRACT_ALIGNMENT_NOTES.md
docs/modules/EW-06/MIGRATION_NOTES.md
docs/modules/EW-06/OPEN_QUESTIONS.md
docs/modules/EW-06/OPEN_QUESTIONS_EW06.md
docs/modules/EW-06/REVISION_SUMMARY.md
docs/modules/EW-06/REVISION_SUMMARY_EW06.md
docs/modules/EW-06/SALES_PURCHASE_INTEGRATION_NOTES_EW06.md
docs/modules/EW-06/TAX_LEDGER_WRITER_CONTRACT.md
docs/modules/EW-06/TEST_EVIDENCE.md
docs/modules/EW-06/TEST_EVIDENCE_EW06.md
docs/modules/EW-06/package.json
docs/modules/MD-01/
docs/modules/MD-01/MANIFEST.md
docs/modules/MD-01/OPEN_ISSUES.md
docs/modules/MD-01/README.md
docs/modules/MD-01/VALIDATION_REPORT.md
docs/modules/MD-01/package.json
docs/senior/
docs/senior/CHECKSUMS.sha256
docs/senior/FINAL_GATE_STATUS_AFTER_EW02_v1_3.md
docs/senior/INT01_RERUN_DISPATCH_AFTER_EW02_v1_3_PASS.md
docs/senior/LOCAL_ASSEMBLY_FILE_INVENTORY.json
docs/senior/LOCAL_ASSEMBLY_MANIFEST_EXPECTED.md
docs/senior/LOCAL_ASSEMBLY_ORDER_v1_0_3.md
docs/senior/LOCAL_DOCKER_POSTGRES_GUIDE_v1_0_3.md
docs/senior/README_LOCAL_ASSEMBLY_INPUT_PACKAGE_v1_0_3.md
docs/senior/SENIOR_REVIEW_EW02_AR_AP_ROUTE_TS2322_HOTFIX_v1_3.md
docs/senior/SENIOR_REVIEW_EW05_CONTRACT_ALIGNMENT_v1_1.md
integration/
integration/INT-01/
integration/INT-01/CROSS_MODULE_SMOKE_TEST_RESULT(3).md
integration/INT-01/FINAL_INTEGRATION_GATE_v1_0_2_REPORTS.sha256
integration/INT-01/FINAL_INTEGRATION_GATE_v1_0_2_REPORTS.zip
integration/INT-01/FINAL_RECOMMENDATION.md
integration/INT-01/INTEGRATION_HARNESS.md
integration/INT-01/OPEN_ISSUES.md
jest.config.cjs
migrations/
migrations/001_EW-01_gl_foundation.sql
migrations/002_EW-06_vat_ledger.sql
migrations/003_EW-02_ar_ap_ledger_allocations.sql
migrations/004_MD-01_master_data_schema.sql
migrations/005_EW-05_inventory_moving_average.sql
migrations/006_EW-03_sales_delivery.sql
migrations/007_EW-04_purchase_grni.sql
migrations/MIGRATION_ORDER.txt
package.json
raw_package_extract/
raw_package_extract/modules/
scripts/
scripts/apply_migrations_in_order.sh
scripts/run_md01_seed.sh
scripts/show_int01_procedure.sh
seeds/
seeds/seed_data/
seeds/seed_data/master_data_baseline.seed.json
seeds/seeders/
seeds/seeders/seed_master_data_baseline.js
seeds/validation/
seeds/validation/README.md
seeds/validation/validate_md01_master_data_baseline.sql
src/
src/app.js
src/modules/
src/modules/inventory/
src/modules/inventory/repositories/
src/modules/inventory/services/
src/modules/purchase/
src/modules/purchase/controllers/
src/modules/purchase/services/
src/modules/purchase/validators/
src/repositories/
src/repositories/AccountRepository.js
src/repositories/FiscalPeriodRepository.js
src/repositories/GlEntryRepository.js
src/repositories/JournalEntryRepository.js
src/repositories/ar-ap-allocation.repository.ts
src/repositories/ar-ap-ledger.repository.ts
src/repositories/outstanding-cache.repository.ts
src/routes/
src/routes/ar-ap.routes.ts
src/routes/gl.js
src/sales/
src/sales/constants.js
src/sales/index.js
src/sales/models/
src/sales/models/DeliveryNote.js
src/sales/models/SalesInvoice.js
src/sales/routes/
src/sales/routes/deliveryNoteRoutes.js
src/sales/routes/salesInvoiceRoutes.js
src/sales/services/
src/sales/services/AccountContractResolver.js
src/sales/services/DeliveryNoteService.js
src/sales/services/SalesInvoiceService.js
src/sales/services/SalesPostingService.js
src/sales/services/inMemoryRepositories.js
src/services/
src/services/PostingService.js
src/services/ar-ap.service.ts
src/taxLedgerRepository.contract.js
src/taxLedgerRepository.pg.js
src/taxLedgerRoutes.js
src/taxLedgerService.js
src/types/
src/types/ar-ap.types.ts
src/utils/
src/utils/UnitOfWork.js
src/validators/
src/validators/PostingValidator.js
test/
test/fakeRepository.js
test/taxLedgerService.test.js
tests/
tests/accounting_contract.test.js
tests/ar-ap.routes.test.ts
tests/ar-ap.service.test.ts
tests/helpers.js
tests/inventory_service.test.js
tests/migration_contract.test.js
tests/purchase-account-resolver.service.test.js
tests/purchase-invoice.service.test.js
tests/run_unit_tests.js
tests/salesPostingService.test.js
tests/validators.test.js
tests/verify_package.js
tsconfig.json
```

## Source modules present under `src/` / `backend/source/`

- EW-01: `repositories/`, `services/`, `validators/`, `routes/gl.js`, `app.js`
- EW-06: `taxLedgerService.js`, `taxLedgerRepository.*.js`, `taxLedgerRoutes.js`
- EW-02: `types/`, `repositories/`, `services/ar-ap.service.ts`, `routes/ar-ap.routes.ts`
- EW-05: `modules/inventory/`
- EW-03: `sales/`
- EW-04: `modules/purchase/`
