# MIGRATION_NOTES.md

## Migration file

```text
migrations/0001_create_tax_ledger_entries.sql
```

## New senior-follow-up columns

```text
invoice_no TEXT NOT NULL
invoice_date DATE NOT NULL
tax_account_id UUID NOT NULL
journal_entry_id UUID NOT NULL
```

## Account and journal references

No `chart_of_accounts` table is created or referenced.

Pending EW-01 final schema confirmation:

```text
tax_account_id -> accounts(id)
journal_entry_id -> final EW-01 journal entry table
```

## Append-only behavior

The migration installs blocking triggers for `UPDATE` and `DELETE` on `tax_ledger_entries`, and attempts runtime role privilege restriction for `app_runtime_role` if that role exists.

## Existing installations

If the earlier EW-06 baseline migration has already been applied, convert this migration into an additive patch instead of re-running table creation. Required additive patch shape:

```sql
ALTER TABLE tax_ledger_entries ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE tax_ledger_entries ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE tax_ledger_entries ADD COLUMN IF NOT EXISTS tax_account_id UUID;
ALTER TABLE tax_ledger_entries ADD COLUMN IF NOT EXISTS journal_entry_id UUID;
```

Then backfill historical rows, set `NOT NULL`, and migrate/copy any old `account_id` value to `tax_account_id` only if Senior confirms the old column represented the VAT account.
