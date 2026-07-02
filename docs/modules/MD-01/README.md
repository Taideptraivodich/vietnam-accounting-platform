# MD-01 Master Data Baseline P0 v1.0

## Purpose

Minimum executable master-data baseline for Integration Smoke Test.

## Scope

Created only:

- `customers`
- `suppliers`
- `items`
- `warehouses`

No CRM, Procurement, Warehouse Advanced, Batch, Serial, Pricing, Inventory Planning, API/UI, or business workflow is included.

## Apply order

1. Apply upstream company/core-accounting migrations so `companies(id)` and `accounts(id)` exist.
2. Apply `migrations/001_md01_master_data_baseline.sql`.
3. Run the seeder with explicit company/account IDs:

```bash
npm install
DATABASE_URL="postgres://..." \
MD01_COMPANY_ID="<companies.id>" \
MD01_INVENTORY_ACCOUNT_ID="<accounts.id>" \
MD01_COGS_ACCOUNT_ID="<accounts.id>" \
MD01_REVENUE_ACCOUNT_ID="<accounts.id>" \
MD01_EXPENSE_ACCOUNT_ID="<accounts.id>" \
npm run seed:md01
```

## Why account IDs are passed in

The dispatch rule says: do not hard-code account codes; account links use `accounts.id`. The seeder therefore requires exact upstream `accounts.id` values instead of account codes.

## Seeded records

- `CUST-SMOKE-001`
- `SUP-SMOKE-001`
- `WH-SMOKE-001`
- `ITEM-STOCK-SMOKE-001`

The item is a stock item and requires inventory, COGS, revenue, and expense account mappings.
