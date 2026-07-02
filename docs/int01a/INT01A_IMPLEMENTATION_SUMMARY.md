# INT-01A Implementation Summary — Executable Cross-Module Smoke Runner P0 v1.0

## Implemented

This package provides an executable Node.js smoke runner:

```text
src/int01a/int01a-smoke-runner.mjs
```

It adds npm scripts:

```json
{
  "scripts": {
    "int01a:smoke": "node ./src/int01a/int01a-smoke-runner.mjs",
    "int01:procedure": "node ./src/int01a/int01a-smoke-runner.mjs --procedure"
  }
}
```

The runner is fail-closed and writes both machine-readable JSON and human-readable Markdown reports.

## Coverage against P0 requirements

| Requirement | Implementation |
|---|---|
| Database connectivity | Connects to `DATABASE_URL`, rejects SQLite/file URLs, verifies PostgreSQL `version()`. |
| Migrations already applied | Detects common migration metadata and required freeze-scope tables. |
| MD-01 seed already applied | Validates company, master data tables, required account IDs, and GRNI subtype. |
| Company exists | Looks up `MD01_COMPANY_ID` in companies table. |
| Customers/suppliers/items/warehouses exist | Requires at least one seeded row per group, scoped by `company_id` when available. |
| Post Sales / Delivery baseline | Calls approved adapter/command and verifies sales, GL, AR deltas. |
| Post Purchase / GRNI baseline | Calls approved adapter/command and verifies purchase, GL, AP deltas plus GRNI subtype guard. |
| Post VAT ledger baseline | Verifies VAT rows created by sales/purchase and linkage to source/accounting document. |
| Post AR/AP settlement | Calls approved adapter/command and verifies append-only GL/allocation or ledger rows. |
| Post inventory movement / adjustment | Calls approved adapter/command and verifies inventory ledger, stock balance non-decrease, GL linkage. |
| Query GL entries | Queries GL entries by returned accounting document IDs. |
| Verify Debit = Credit | Supports debit/credit columns or signed amount columns with configurable epsilon. |
| Verify company_id isolation | Checks company column for GL/VAT/AR/AP/inventory ledgers where applicable; fails if not verifiable. |
| Verify inventory ledger ↔ GL linkage | Requires source/accounting document linkage or GL inventory ledger linkage. |
| Cancel one document and verify reversal | Cancels sales document through approved surface; verifies original GL rows unchanged and reversal GL appended/balanced. |

## What is intentionally not implemented

The runner does not implement Sales, Purchase, VAT, AR/AP, Inventory, GL, valuation, settlement, GRNI, or reversal business logic. Those calls must be bound to existing approved module surfaces in the candidate tree by adapter module or command wrappers.

If no approved surface is bindable, the runner returns FAIL/BLOCKED with reproduction steps.

## Files included

```text
src/int01a/int01a-smoke-runner.mjs
src/int01a/int01a-approved-surface-adapter.example.mjs
package.json
package.json.patch
.env.integration.example
README_RUN_INT01A_SMOKE.md
EXPECTED_ENVIRONMENT_VARIABLES.md
SMOKE_TEST_RESULT_FORMAT.md
FAILURE_REPORTING_FORMAT.md
INT01A_IMPLEMENTATION_SUMMARY.md
INT01A_OPEN_ISSUES.md
reports/.gitkeep
```
