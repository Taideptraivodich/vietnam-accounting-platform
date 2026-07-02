# EW-05 Mergeable Inventory Implementation — P0 v1.1

This package patches EW-05 v1.0 into a contract-aligned v1.1 package for EW-01 UUID and Accounting Engine compatibility while staying inside Architecture Freeze v1.0.

## Contents

```text
MIGRATION_ORDER.md
DATABASE_CONTRACT_EW05_v1_1.md
ACCOUNTING_ENGINE_INTEGRATION_EW05_v1_1.md
INVENTORY_LEDGER_SCHEMA_PATCH.sql
migrations/001_inventory_mergeable_v1_1.sql
src/modules/inventory/services/InventoryService.js
src/modules/inventory/repositories/InMemoryInventoryRepository.js
src/modules/inventory/repositories/PostgresInventoryRepository.js
tests/accounting_contract.test.js
tests/inventory_service.test.js
tests/migration_contract.test.js
tests/verify_package.js
IMPLEMENTATION_SUMMARY.md
OPEN_ISSUES.md
TEST_EVIDENCE.md
TEST_EVIDENCE_EW05_v1_1.md
```

## Commands

```bash
npm test
npm run verify
```

## v1.1 contract alignment

Patched items:

```text
- Inventory table IDs and linkage fields are UUID-compatible.
- inventory_ledger_entries.id is UUID and compatible with gl_entries.inventory_ledger_entry_id UUID.
- Service uses accountingEngine.postAccountingDocument(request, tx).
- Accounting payload uses snake_case fields.
- GL debit_amount / credit_amount are integer minor units for EW-01 BIGINT GL lines.
- No alternate GL posting contract, account resolver, or duplicate GL table is introduced.
```

Explicitly absent:

```text
FIFO
repost valuation tool
landed cost
serial/batch
manufacturing inventory flow
```
