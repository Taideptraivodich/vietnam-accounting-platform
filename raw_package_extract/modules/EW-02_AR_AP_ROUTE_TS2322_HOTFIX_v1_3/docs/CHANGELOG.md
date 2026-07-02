# EW-02 Changelog — Revised P0 Patch

## Changed

- Reworked `ar_ap_allocations` into an append-only settlement event ledger.
- Replaced mutable allocation cancellation with appended negative cancellation events.
- Added `allocation_event_type`, `reversal_of_allocation_id`, and `reversal_reason` to allocation schema and types.
- Updated allocation active-query and sum logic to derive state from events.
- Aligned GL service interface to EW-01 `postAccountingDocument` and `reverseAccountingDocument` names.
- Added optional transaction context placeholder for integrated unit-of-work alignment.
- Updated routes to accept an idempotency key for allocation cancellation.
- Updated tests and evidence docs for append-only cancellation.

## Unchanged

- `ar_ap_ledger_entries` remains append-only.
- `ar_ap_outstanding_cache` remains derived/cache.
- Direct cash/bank purchase invoice behavior remains: no AP ledger entry and no outstanding.
