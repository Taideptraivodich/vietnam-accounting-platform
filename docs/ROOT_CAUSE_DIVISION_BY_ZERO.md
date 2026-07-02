# Root Cause — v1.1 Division-by-Zero Failure

## Observed v1.1 behavior

The v1.1 preseed generated verification SQL using expressions like:

```sql
SELECT CASE WHEN <verification_condition> THEN 'ok' ELSE (1/0)::text END AS _verify_* \gset
```

When any verification condition evaluated false, PostgreSQL reported only:

```text
ERROR: division by zero
```

That hid the actual failed verification name and caused the transaction to roll back before the script emitted usable `.env` lines.

## Diagnosed failing area

The captured v1.1 SQL reached the required-account verification group, including the GRNI checks and final distinct-account check:

```text
_verify_grni_uuid
_verify_grni_type
_verify_grni_subtype
_verify_grni_balance
_verify_distinct_accounts
```

The exact boolean branch could not be recovered from the old database output because every false branch intentionally raised the same anonymous `division by zero` error. The actionable diagnosis is that v1.1's verification mechanism made a mandatory account/UUID/subtype failure non-diagnostic. That is the P0 defect fixed here.

## v1.2 fix

v1.2 replaces all anonymous sentinels with a named assertion function:

```sql
CREATE OR REPLACE FUNCTION pg_temp.md01_preseed_assert(
  passed boolean,
  check_name text,
  details text
) RETURNS void ...
```

A failed verification now raises, for example:

```text
MD01_PRESEED_VERIFY_FAILED[grni.account_subtype]: MD01_GRNI_ACCOUNT_ID must have non-null account_subtype=goods_received_not_invoiced
```

or:

```text
MD01_PRESEED_VERIFY_FAILED[accounts.distinct]: inventory, COGS, revenue, expense fallback, and GRNI accounts must be five distinct accounts
```

## UUID compatibility fix

v1.1 also used regexes that could over-specify UUID internals such as version/variant nibbles. v1.2 checks only canonical PostgreSQL UUID text shape:

```text
8-4-4-4-12 hex digits
```

It intentionally does not restrict version or variant nibbles, because the PostgreSQL `uuid` type and generation strategy are the source of truth.
