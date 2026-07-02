# OPEN_QUESTIONS_EW06.md

## 1. EW-01 final table names and FK targets

The migration intentionally does not introduce a `chart_of_accounts` dependency.

Open confirmation needed after EW-01 publishes final schema:

```text
tax_account_id FK target: accounts(id)
journal_entry_id FK target: journal_entries(id) or EW-01 final journal table name
```

Once EW-01 confirms final canonical names, add/validate the FK constraints if required by Senior.

## 2. Runtime DB role name

The migration uses defensive GRANT/REVOKE logic for `app_runtime_role`, matching the earlier EW-06 baseline convention.

Open confirmation needed:

```text
actual runtime application role name for production/staging
```

If different, apply the equivalent `GRANT INSERT, SELECT` and `REVOKE UPDATE, DELETE` to the real role.

## 3. Sales/Purchase final call-site ownership

EW-06 is ready for EW-03/EW-04 wiring, but this package does not modify Sales/Purchase source code.

Open coordination point:

```text
EW-03/EW-04 should wire EW-06 after EW-01 postAccountingDocument returns journal_entry_id.
```

## 4. VAT category value set

`tax_category` remains optional/free text because the senior integration request did not define a canonical value set.

Open confirmation needed if Senior wants a fixed enum, e.g.:

```text
standard
zero_rated
exempt
non_taxable
```
