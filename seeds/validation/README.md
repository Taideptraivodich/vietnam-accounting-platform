# Validation usage

Run with `psql` after applying the migration and after upstream company/account baseline exists.

Example:

```bash
psql "$DATABASE_URL" \
  -v company_a_id="$COMPANY_A_ID" \
  -v company_b_id="$COMPANY_B_ID" \
  -v inventory_account_id="$INVENTORY_ACCOUNT_ID" \
  -v cogs_account_id="$COGS_ACCOUNT_ID" \
  -v revenue_account_id="$REVENUE_ACCOUNT_ID" \
  -v expense_account_id="$EXPENSE_ACCOUNT_ID" \
  -f validation/validate_md01_master_data_baseline.sql
```

The script rolls back validation inserts.
