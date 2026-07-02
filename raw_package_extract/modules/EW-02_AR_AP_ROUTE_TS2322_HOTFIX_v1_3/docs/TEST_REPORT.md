# EW-02 Test Report — Revised P0 Patch

## Summary

The test suite was updated to reflect the senior P0 revision.

## Covered Behaviors

| Area | Evidence |
|---|---|
| Receipt Voucher posting | Calls EW-01 `postAccountingDocument`; writes AR/AP payment ledger entry. |
| Payment Voucher posting | Calls EW-01 `postAccountingDocument`; writes AR/AP payment ledger entry. |
| Voucher cancellation | Calls EW-01 `reverseAccountingDocument`; writes AR/AP reversal ledger entry. |
| Allocation creation | Inserts allocation event rows and updates derived outstanding cache. |
| Allocation cancellation | Appends negative cancellation event with `reversal_of_allocation_id`; no mutation of original allocation row. |
| Over-allocation prevention | Blocks payment and invoice over-allocation using effective allocation sums. |
| Cross-company protection | Blocks allocation across companies. |
| Invoice cancellation guard | Blocks invoice cancellation while active allocation events exist. |
| Direct cash/bank purchase invoice | Creates no AP ledger entry and no outstanding. |

## Architectural Checks

The revised architectural test asserts the cancellation SQL pattern contains:

```text
INSERT INTO ar_ap_allocations
allocated_amount = -original amount
allocation_event_type = cancelled
reversal_of_allocation_id = original allocation id
```

and does not contain:

```text
UPDATE <allocation table>
DELETE
```

## Scope Control

No P1/P2 features were introduced.
