# TEST_EVIDENCE_EW05_v1_1

## Environment

```text
Node.js: v22.16.0
Test runner: node --test
Date: 2026-06-27
```

## Commands executed

```bash
npm test
npm run verify
```

## Result

```text
npm test: PASS
21 tests passed, 0 failed

npm run verify: PASS
EW-05 v1.1 package verification PASS
```

## v1.1 P0 contract coverage

| Required check | Evidence |
|---|---|
| inventory table IDs are UUID-compatible | `migration_contract.test.js` verifies UUID primary keys and UUID FK columns. `inventory_service.test.js` verifies generated runtime IDs are plain UUIDs without prefixes. |
| `inventory_ledger_entries.id` compatible with `gl_entries.inventory_ledger_entry_id` | `migration_contract.test.js` verifies UUID ledger id and UUID GL linkage column/FK. |
| `accountingEngine.post()` replaced | `accounting_contract.test.js` and `verify_package.js` reject the legacy call. |
| `postAccountingDocument(request, tx)` used | `accounting_contract.test.js` and runtime service tests verify the canonical call and explicit transaction argument. |
| Accounting payload uses snake_case | `inventory_service.test.js` checks request and line keys; camelCase line payload fields are rejected. |
| GL amounts use integer minor units | `inventory_service.test.js` checks `debit_amount` / `credit_amount` are integer values produced by `toMinorUnits()`. |
| No alternate GL posting contract | `verify_package.js` checks no duplicate `gl_entries` / `journal_entries` creation and no local GL writer. |
| Forbidden inventory scope remains absent | `migration_contract.test.js` checks executable migration text for forbidden future scope tokens. |

## Freeze Scope coverage retained

| Required test | Evidence |
|---|---|
| Append-only trigger rejects UPDATE/DELETE | `migration_contract.test.js` verifies trigger DDL; `inventory_service.test.js` verifies repository mutation paths reject update/delete. |
| `stock_balances` updates after receipt/issue | `inventory_service.test.js`: `stock_balances update after receipt and issue`. |
| Moving Average computes `stock_value_difference` | `inventory_service.test.js`: `Moving Average valuation computes stock_value_difference and updated valuation rate`. |
| Negative stock rejected | `inventory_service.test.js`: `negative stock issue is rejected by default`. |
| Backdated entry rejected | `inventory_service.test.js`: `backdated entry is rejected when later entry exists for same company item warehouse`. |
| Opening Stock requires offset account | `inventory_service.test.js`: `Opening Stock requires opening_stock_offset_account_id and opening period`. |
| Inventory Adjustment requires reason + offset account | `inventory_service.test.js`: `Inventory Adjustment requires reason and offset_account_id`. |
| Inventory GL lines produced from `stock_value_difference` | `inventory_service.test.js`: inbound and outbound GL tests. |
| Warehouse transfer pairing | `inventory_service.test.js`: `Transfer creates paired source and target entries using transfer_group_id and transfer_pair_id`. |
