# INT-01A Expected Environment Variables

## Required

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | Yes | Must be exactly `integration`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string for disposable local candidate DB. SQLite/file URLs are rejected. |
| `MD01_COMPANY_ID` | Yes | Real company ID created by MD01/EW01 preseed + MD-01 seed. |
| `MD01_INVENTORY_ACCOUNT_ID` | Yes | Real inventory account ID. |
| `MD01_COGS_ACCOUNT_ID` | Yes | Real COGS account ID. |
| `MD01_REVENUE_ACCOUNT_ID` | Yes | Real revenue account ID. |
| `MD01_EXPENSE_ACCOUNT_ID` | Yes | Real expense account ID. |

## Strongly recommended MD-01 IDs

These are not mandatory at process start because some approved module surfaces may resolve them from the seed. If supplied, the runner validates that the IDs exist.

| Variable | Purpose |
|---|---|
| `MD01_GRNI_ACCOUNT_ID` | Real GRNI account. Subtype must be `goods_received_not_invoiced`. |
| `MD01_OUTPUT_VAT_ACCOUNT_ID` | Real output VAT account. |
| `MD01_INPUT_VAT_ACCOUNT_ID` | Real input VAT account. |
| `MD01_AR_ACCOUNT_ID` | Real AR control account. |
| `MD01_AP_ACCOUNT_ID` | Real AP control account. |
| `MD01_CUSTOMER_ID` | Real customer ID for smoke adapter. |
| `MD01_SUPPLIER_ID` | Real supplier ID for smoke adapter. |
| `MD01_ITEM_ID` | Real item ID for smoke adapter. |
| `MD01_WAREHOUSE_ID` | Real warehouse ID for smoke adapter. |

## Approved surface binding

Preferred:

| Variable | Required when using adapter | Purpose |
|---|---:|---|
| `INT01A_ADAPTER_MODULE` | Yes | Path to an adapter module that calls existing approved module APIs/services only. |

Alternative command mode:

| Variable | Required in command mode | Purpose |
|---|---:|---|
| `INT01A_POST_SALES_DELIVERY_COMMAND` | Yes | Existing command wrapper for Sales/Delivery baseline. |
| `INT01A_POST_PURCHASE_GRNI_COMMAND` | Yes | Existing command wrapper for Purchase/GRNI baseline. |
| `INT01A_SETTLE_ARAP_COMMAND` | Yes | Existing command wrapper for AR/AP settlement. |
| `INT01A_POST_INVENTORY_ADJUSTMENT_COMMAND` | Yes | Existing command wrapper for inventory movement/adjustment. |
| `INT01A_CANCEL_DOCUMENT_COMMAND` | Yes | Existing command wrapper for cancel/reversal. |
| `INT01A_POST_VAT_LEDGER_COMMAND` | Optional | Existing VAT command wrapper if explicit VAT step is required. |

Each command receives JSON through stdin and `INT01A_SMOKE_INPUT`; it must return JSON on stdout.

## Optional runner controls

| Variable | Default | Purpose |
|---|---|---|
| `INT01A_REPORT_DIR` | `reports/int01a` | Output directory. |
| `INT01A_RUN_ID` | generated | Stable run ID for deterministic report names. |
| `INT01A_REQUIRE_EXPLICIT_VAT_STEP` | `0` | If `1`, calls `postVatLedger`; otherwise VAT is verified from sales/purchase output. |
| `INT01A_MONEY_EPSILON` | `0.0001` | Numeric tolerance for debit/credit checks. |
| `INT01A_INCLUDE_STACK` | unset | If `1`, includes stack traces in JSON report. |

## Table/column overrides

The runner autodetects common table names. If the candidate schema uses different names, set table overrides rather than changing business logic. Examples:

```bash
INT01A_TABLE_GL_ENTRIES=accounting_entries
INT01A_TABLE_ACCOUNTING_DOCUMENTS=accounting_documents
INT01A_TABLE_VAT_LEDGER=vat_ledger_entries
INT01A_TABLE_INVENTORY_LEDGER=inventory_ledger_entries
INT01A_TABLE_STOCK_BALANCES=stock_balances
```

Column overrides follow this pattern:

```text
INT01A_COLUMN_<TABLE_KIND>_<COLUMN_ROLE>
```

Examples:

```bash
INT01A_COLUMN_GL_ENTRIES_ACCOUNTING_DOCUMENT_ID=accounting_document_id
INT01A_COLUMN_GL_ENTRIES_DEBIT=debit
INT01A_COLUMN_GL_ENTRIES_CREDIT=credit
INT01A_COLUMN_GL_ENTRIES_COMPANY_ID=company_id
```
