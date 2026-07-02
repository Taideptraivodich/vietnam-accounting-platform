# MD01/EW01 Preseed Patch Summary P0 v1.1

## Implemented

```text
Added account_subtype column discovery via ACCOUNT_SUBTYPE_COLS.
Added explicit subtype values for all required baseline accounts.
Added GRNI baseline account role and MD01_GRNI_ACCOUNT_ID output.
Updated generated env file writer and parser to require GRNI ID.
Updated distinct-account verification from 4 accounts to 5 accounts.
Added subtype verification during setup and verify-only modes.
Changed Python psql invocation to psql -d "$DATABASE_URL" compatible form.
Added verification SQL for observed public.accounts account_subtype schema.
```

## Required subtype mapping

```text
inventory -> merchandise_inventory
cogs      -> cogs
revenue   -> sales_revenue
expense   -> purchase_expense
grni      -> goods_received_not_invoiced
```

## Scope controls

```text
No production data.
No fake IDs.
No business logic changes.
No architecture changes.
No MD-01 bypass.
No NOT NULL weakening.
```
