# EW-02 DB Append-Only Trigger Evidence

## Requirement

Senior Round 2 requires hard DB-level enforcement for:

```text
ar_ap_ledger_entries: forbid UPDATE/DELETE
ar_ap_allocations: forbid UPDATE/DELETE
```

`ar_ap_outstanding_cache` may remain mutable because it is derived/rebuildable.

## Migration evidence

`migrations/001_ar_ap_ledger_and_allocations.sql` defines:

```sql
CREATE OR REPLACE FUNCTION ew02_forbid_ar_ap_append_only_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: % is not allowed. Append a reversal/event row instead.', TG_TABLE_NAME, TG_OP
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;
```

Triggers:

```sql
CREATE TRIGGER trg_ar_ap_ledger_entries_no_update
BEFORE UPDATE ON ar_ap_ledger_entries
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();

CREATE TRIGGER trg_ar_ap_ledger_entries_no_delete
BEFORE DELETE ON ar_ap_ledger_entries
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();

CREATE TRIGGER trg_ar_ap_allocations_no_update
BEFORE UPDATE ON ar_ap_allocations
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();

CREATE TRIGGER trg_ar_ap_allocations_no_delete
BEFORE DELETE ON ar_ap_allocations
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();
```

## Cancellation model preserved

Allocation cancellation remains append-only:

```sql
INSERT INTO ar_ap_allocations (...)
SELECT ..., -a.allocated_amount, ..., 'cancelled', a.id, ...
FROM ar_ap_allocations a
```

Original allocation rows are never updated or deleted.
