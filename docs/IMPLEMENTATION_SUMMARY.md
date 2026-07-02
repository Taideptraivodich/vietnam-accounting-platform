# Implementation Summary — MD01/EW01 Preseed v1.2

## Patched scripts

- `scripts/setup_md01_local_preseed.sh`
  - Bash wrapper.
  - Supports `PYTHON_BIN` override.
  - Falls back through `python3`, `python`, and Windows `py -3`.

- `scripts/setup_md01_local_preseed.py`
  - Generates SQL into the requested output directory.
  - Executes SQL with `psql -X -q -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f <generated.sql>`.
  - Captures emitted env lines.
  - Writes `.env.integration.generated`, JSON result, readiness report, and psql stdout log.

## SQL strategy

The generated SQL performs one transaction:

1. Create temporary ID table.
2. Create named assertion function.
3. Insert/select company `MD01LOCAL`.
4. Insert/select all five account baselines.
5. Verify each required field with named assertions.
6. Verify account IDs are distinct.
7. Commit.
8. Emit clean env lines.

## Account semantics preserved

No MD01/EW01 semantics are weakened:

```text
inventory: ASSET / merchandise_inventory / DEBIT
COGS: EXPENSE / cogs / DEBIT
revenue: REVENUE / sales_revenue / CREDIT
expense fallback: EXPENSE / purchase_expense / DEBIT
GRNI: LIABILITY / goods_received_not_invoiced / CREDIT
```

## UUID policy

v1.2 accepts canonical PostgreSQL UUID output:

```text
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

It does not restrict UUID version or variant nibbles.

## Idempotency

`INSERT ... WHERE NOT EXISTS ... ON CONFLICT DO NOTHING` plus post-insert selection means reruns select existing rows instead of duplicating them. If an existing row has the expected code but incorrect type/subtype/balance/currency/activity, v1.2 fails with a named verification error.
