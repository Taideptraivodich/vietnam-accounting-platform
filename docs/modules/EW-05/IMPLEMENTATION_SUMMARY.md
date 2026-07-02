# IMPLEMENTATION_SUMMARY — EW-05 Mergeable Inventory Implementation P0 v1.1

## Status

`READY_FOR_SENIOR_REVIEW` as a P0 contract-alignment patch.

EW-05 v1.1 keeps the Freeze Scope v1.0 Inventory implementation from v1.0 and patches the P0 merge blockers raised by Senior Review.

## P0 fixes completed

| Required fix | v1.1 implementation |
|---|---|
| UUID-compatible inventory IDs | Migration changed inventory primary keys, FK columns, source document IDs, transfer IDs, reversal IDs, stock balance linkage, and document IDs from text-style keys to UUID-compatible columns. Runtime-generated IDs now use plain `crypto.randomUUID()` with no prefixes. |
| `inventory_ledger_entries.id` compatible with `gl_entries.inventory_ledger_entry_id` | `inventory_ledger_entries.id` is UUID. Migration adds/verifies `gl_entries.inventory_ledger_entry_id UUID` and adds the FK to the inventory ledger. |
| Replace `accountingEngine.post()` | `InventoryService` now requires and calls `accountingEngine.postAccountingDocument(request, tx)`. |
| Snake_case Accounting Engine payload | GL request uses `company_id`, `posting_date`, `source_document_type`, `source_document_id`, `idempotency_key`, and line fields `account_id`, `debit_amount`, `credit_amount`, `inventory_item_id`, `warehouse_id`, `inventory_ledger_entry_id`. |
| GL monetary amounts as integer minor units / BIGINT-compatible | Inventory valuation remains decimal internally. GL line composition converts `stock_value_difference` into deterministic integer minor-unit `debit_amount` / `credit_amount`. |
| No alternate GL posting contract | EW-05 uses only EW-01 Accounting Engine and EW-01 `gl_entries.inventory_ledger_entry_id`. No duplicate GL table or local GL writer was added. |
| No forbidden scope | No future inventory features were implemented. |

## Implemented Inventory scope retained

```text
inventory_ledger_entries
stock_balances
opening_stock_documents
inventory_adjustments
Moving Average valuation baseline
negative stock blocked by default
backdated post/cancel guard
inventory ledger ↔ GL linkage
warehouse transfer pairing
```

## Files added / patched in v1.1

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
TEST_EVIDENCE_EW05_v1_1.md
```

## Accounting boundary

Inventory does not insert into `gl_entries` directly. Inventory computes the accounting impact from `stock_value_difference`, converts the amount to EW-01 integer minor units, and calls `postAccountingDocument(request, tx)` inside the same transaction boundary.

## Test evidence

```text
npm test: PASS
21 tests passed, 0 failed

npm run verify: PASS
EW-05 v1.1 package verification PASS
```
