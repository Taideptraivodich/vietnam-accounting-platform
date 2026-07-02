# AR/AP Allocation Append-Only Patch — EW-02

## Problem Fixed

Previous implementation cancelled allocations by mutating the posted allocation row:

```text
a mutable status update on ar_ap_allocations
```

That violated the append-only freeze rule.

## Implemented Pattern

EW-02 now treats `ar_ap_allocations` as an append-only settlement event ledger.

Chosen senior-approved option: **Option C — negative allocation event with `reversal_of_allocation_id`**.

## Schema Changes

`ar_ap_allocations` now contains:

```text
allocation_event_type: allocated | cancelled | reversed
reversal_of_allocation_id: nullable FK to ar_ap_allocations.id
reversal_reason: nullable text
allocated_amount: positive for allocated events, negative for cancelled/reversed events
```

Enforced constraints:

```text
allocated event  => allocated_amount > 0 and reversal_of_allocation_id IS NULL
cancelled event  => allocated_amount < 0 and reversal_of_allocation_id IS NOT NULL
reversed event   => allocated_amount < 0 and reversal_of_allocation_id IS NOT NULL
```

A partial unique index prevents duplicate reversal events for the same original allocation:

```text
uq_ar_ap_allocation_single_reversal(company_id, reversal_of_allocation_id)
WHERE allocation_event_type IN ('cancelled', 'reversed')
```

## Repository Behavior

`ArApAllocationRepository.cancel()` now executes an append-only `INSERT ... SELECT`:

```text
INSERT INTO ar_ap_allocations (... allocated_amount, allocation_event_type, reversal_of_allocation_id ...)
SELECT -a.allocated_amount, 'cancelled', a.id
FROM ar_ap_allocations a
WHERE a.id = :allocation_id
  AND a.allocation_event_type = 'allocated'
  AND no prior cancellation/reversal exists
```

It does **not** execute `UPDATE` or `DELETE` on `ar_ap_allocations`.

## Active Allocation Logic

Active allocations are derived as:

```text
allocation_event_type = 'allocated'
AND NOT EXISTS cancellation/reversal event where reversal_of_allocation_id = allocation.id
```

## Sum Logic

Effective allocation amount is derived as:

```text
SUM(ar_ap_allocations.allocated_amount)
```

Because cancellation/reversal events are negative, cancelled allocations net to zero while retaining the complete audit trail.

## Outstanding Cache

`ar_ap_outstanding_cache` remains a derived/cache table. It is updated after allocation/cancellation, but it is not the source of truth.
