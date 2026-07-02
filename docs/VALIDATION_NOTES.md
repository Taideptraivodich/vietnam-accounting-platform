# Validation Notes — MD01/EW01 Preseed v1.2

## Local validation performed in this package build

The package was generated and the SQL sample was produced with:

```bash
./scripts/setup_md01_local_preseed.sh \
  --output-dir ./generated_sql_sample \
  --no-execute \
  --print-generated-sql
```

The AI sandbox used for package assembly did not have `psql` or Docker available, so a live clean PostgreSQL migration run was not executed inside the sandbox. The included commands are intended for the local Final Gate environment after migrations `001`–`007`.

## Clean migrated database expectations

After migrations `001`–`007`, the schema must contain:

```text
public.companies
public.accounts
```

The current account contract is expected to include:

```text
id uuid primary key default gen_random_uuid()
company_id uuid not null
code varchar not null
name varchar not null
account_type varchar not null
account_subtype varchar not null
normal_balance varchar not null
currency char/varchar not null default VND
is_active boolean not null
```

## Required baseline rows

| Role | Code | account_type | account_subtype | normal_balance | currency |
|---|---:|---|---|---|---|
| company | MD01LOCAL | n/a | n/a | n/a | n/a |
| inventory | 156 | ASSET | merchandise_inventory | DEBIT | VND |
| COGS | 632 | EXPENSE | cogs | DEBIT | VND |
| revenue | 511 | REVENUE | sales_revenue | CREDIT | VND |
| expense fallback | 642 | EXPENSE | purchase_expense | DEBIT | VND |
| GRNI | 3318 | LIABILITY | goods_received_not_invoiced | CREDIT | VND |

## Failure policy

v1.2 fails closed. It does not silently alter an existing account with the same code if that row has wrong semantics. It reports the mismatch with a named `MD01_PRESEED_VERIFY_FAILED[...]` error.

Examples:

```text
MD01_PRESEED_VERIFY_FAILED[inventory.account_subtype]
MD01_PRESEED_VERIFY_FAILED[revenue.normal_balance]
MD01_PRESEED_VERIFY_FAILED[grni.currency]
MD01_PRESEED_VERIFY_FAILED[accounts.distinct]
```

## Idempotency policy

- First run on a clean migrated DB inserts the baseline rows.
- Second and later runs select the same rows and emit the same IDs.
- Existing correct rows are reused.
- Existing incorrect rows fail verification instead of being hidden or weakened.
