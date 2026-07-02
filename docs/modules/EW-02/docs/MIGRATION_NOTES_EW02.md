# Migration Notes — EW-02

## New Install

Use the revised `001_ar_ap_ledger_and_allocations.sql` directly.

## Existing Install Upgrade

If an environment already applied the previous EW-02 migration, run an upgrade migration equivalent to the following plan.

### 1. Add allocation event columns

```sql
ALTER TABLE ar_ap_allocations
  ADD COLUMN allocation_event_type VARCHAR(20) NOT NULL DEFAULT 'allocated',
  ADD COLUMN reversal_of_allocation_id UUID REFERENCES ar_ap_allocations(id),
  ADD COLUMN reversal_reason TEXT;
```

### 2. Convert previously cancelled rows, if any

For each legacy row where `status = 'cancelled'`, append a cancellation event:

```sql
INSERT INTO ar_ap_allocations (
  company_id, party_type, party_id,
  invoice_ledger_entry_id, payment_ledger_entry_id,
  allocated_amount, currency_code, allocation_date,
  allocation_event_type, reversal_of_allocation_id, reversal_reason,
  idempotency_key, created_by
)
SELECT
  company_id, party_type, party_id,
  invoice_ledger_entry_id, payment_ledger_entry_id,
  -allocated_amount, currency_code, COALESCE(cancelled_at::date, CURRENT_DATE),
  'cancelled', id, cancellation_reason,
  CONCAT('legacy-cancel:', id::text), COALESCE(cancelled_by, created_by)
FROM ar_ap_allocations
WHERE status = 'cancelled';
```

### 3. Remove mutable status/cancellation fields from canonical schema

After data conversion and verification, remove legacy mutable columns from the canonical schema:

```sql
ALTER TABLE ar_ap_allocations
  DROP COLUMN status,
  DROP COLUMN cancelled_at,
  DROP COLUMN cancelled_by,
  DROP COLUMN cancellation_reason;
```

### 4. Add constraints and indexes

```sql
ALTER TABLE ar_ap_allocations
  ADD CONSTRAINT ck_allocation_event_amount_direction CHECK (
    (allocation_event_type = 'allocated' AND allocated_amount > 0 AND reversal_of_allocation_id IS NULL)
    OR
    (allocation_event_type IN ('cancelled', 'reversed') AND allocated_amount < 0 AND reversal_of_allocation_id IS NOT NULL)
  );

CREATE UNIQUE INDEX uq_ar_ap_allocation_single_reversal
  ON ar_ap_allocations (company_id, reversal_of_allocation_id)
  WHERE allocation_event_type IN ('cancelled', 'reversed');
```

## Notes

Do not repair historical allocation rows by updating them after they are posted. Historical correction must be represented as new rows.
