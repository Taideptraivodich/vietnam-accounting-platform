# MD01/EW01 Preseed Test Evidence P0 v1.1

## Static checks performed in package build sandbox

```text
python3 -m py_compile scripts/setup_md01_local_preseed.py: PASS
scripts/setup_md01_local_preseed.sh copied and marked executable: PASS
Patch diff generated: PASS
Verification SQL included: PASS
setup_md01_local_preseed.py --help: PASS
```

## Database execution evidence

```text
Not executed against the user's local Docker PostgreSQL inside this artifact build sandbox.
LOCAL-ASSEMBLY-01 must run the database validation commands after applying ordered migrations.
```

## Expected local evidence after rerun

```text
company record exists: PASS
inventory/cogs/revenue/expense/grni account records exist: PASS
all account records belong to MD01_COMPANY_ID: PASS
account_subtype is non-null for all required accounts: PASS
GRNI account_subtype=goods_received_not_invoiced: PASS
IDs are emitted from real PostgreSQL select/insert: PASS
MD-01 seed can run after sourcing .env.integration.generated: PASS
```
