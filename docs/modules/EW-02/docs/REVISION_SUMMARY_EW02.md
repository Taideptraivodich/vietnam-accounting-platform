# REVISION SUMMARY — EW-02

## Status

Targeted P0 revision completed for EW-02 AR/AP Payment Settlement.

## Senior Request Addressed

| Item | Result |
|---|---|
| P0-01 Append-only cancellation for `ar_ap_allocations` | Implemented. Cancellation appends a negative allocation event row. No posted allocation row is updated/deleted. |
| P0-02 EW-01 canonical accounts table | Aligned. Voucher account fields and GL lines use `accountId`, meaning the value of `accounts.id`; no `chart` + `_of_` + `accounts` dependency remains. |
| P0-03 EW-01 posting service | Aligned. Receipt/Payment vouchers compose GL lines and call `postAccountingDocument`; cancellations call `reverseAccountingDocument`. EW-02 does not write `gl_entries`. |
| P0-04 Source-of-truth separation | Preserved. AR/AP ledger = monetary events, allocations = settlement events, outstanding = rebuildable cache. |
| P0-05 Direct cash/bank purchase invoices | Preserved. `directCashPayment` returns `null` and creates no AP ledger/outstanding; later Payment Voucher settlement cannot target a missing AP ledger entry. |

## Chosen Allocation Cancellation Pattern

Chosen option: **Option C — negative allocation event with `reversal_of_allocation_id`**.

Original allocation row:

```text
allocation_event_type = allocated
allocated_amount > 0
reversal_of_allocation_id = NULL
```

Cancellation event row:

```text
allocation_event_type = cancelled
allocated_amount = -original.allocated_amount
reversal_of_allocation_id = original_allocation.id
```

The effective allocated amount is the sum of allocation event amounts. Active allocations are original allocation rows that do not have a cancellation/reversal event referencing them.

## Files Changed

```text
001_ar_ap_ledger_and_allocations.sql
ar-ap.types.ts
ar-ap-allocation.repository.ts
ar-ap.service.ts
ar-ap.routes.ts
ar-ap.service.test.ts
IMPLEMENTATION_REPORT.md
TEST_REPORT.md
CHANGELOG.md
OPEN_QUESTIONS.md
```

## New Revision Evidence Files

```text
REVISION_SUMMARY_EW02.md
AR_AP_ALLOCATION_APPEND_ONLY_PATCH.md
CONTRACT_ALIGNMENT_NOTES_EW02.md
MIGRATION_NOTES_EW02.md
TEST_EVIDENCE_EW02.md
OPEN_QUESTIONS_EW02.md
CHANGED_FILES.md
```
