# EW-02 Implementation Report — Revised P0 Patch

## Scope

EW-02 implements AR/AP monetary ledger, settlement allocations, outstanding cache, Receipt Voucher and Payment Voucher service flows under Architecture Freeze v1.0.

This revised package addresses the senior P0 request for append-only AR/AP allocation cancellation and EW-01 contract alignment.

## Key Tables

| Table | Purpose | Source of truth? |
|---|---|---|
| `ar_ap_ledger_entries` | Monetary AR/AP events: invoice, payment, advance, reversal | Yes |
| `ar_ap_allocations` | Settlement/allocation events between payment ledger entries and invoice ledger entries | Yes for settlement history |
| `ar_ap_outstanding_cache` | Derived/cache outstanding balance for fast query | No |
| `receipt_vouchers` | AR receipt voucher lifecycle | Source document |
| `payment_vouchers` | AP payment voucher lifecycle | Source document |

## Append-Only Allocation Cancellation

Chosen pattern: **negative allocation event with `reversal_of_allocation_id`**.

Original allocation rows remain unchanged. Cancellation appends a new event row:

```text
allocation_event_type = cancelled
allocated_amount = -original.allocated_amount
reversal_of_allocation_id = original_allocation.id
```

The repository computes active allocations by selecting allocated events that do not have a cancellation/reversal event referencing them. Effective allocated amount is `SUM(allocated_amount)`, so a cancellation nets the original allocation to zero without mutating it.

## EW-01 Contract Alignment

Receipt Voucher and Payment Voucher compose GL lines and call:

```text
postAccountingDocument(request, tx?)
reverseAccountingDocument(request, tx?)
```

EW-02 does not write GL entries directly.

Account fields use canonical `accountId` semantics and are intended to reference EW-01 `accounts.id`. No `chart` + `_of_` + `accounts` dependency is introduced.

## Outstanding Behavior

Outstanding is derived from AR/AP ledger and allocation events. The cache is updated after posting/allocation/cancellation and can be rebuilt; it is not authoritative.

## Direct Cash/Bank Purchase Invoice

If a purchase invoice is paid directly via cash/bank, the invoice ledger writer must be called with `directCashPayment = true`. EW-02 then creates no AP ledger entry and no outstanding cache row, so no Payment Voucher can later settle the invoice through AR/AP allocation.

## Revision Acceptance Snapshot

| Acceptance criterion | Status |
|---|---|
| Allocation cancellation is append-only | PASS |
| No update/delete of posted AR/AP ledger/allocation rows | PASS for ledger/allocation repositories |
| Uses canonical accounts/account_id | PASS |
| Uses EW-01 posting contract | PASS |
| Outstanding remains derived/cache | PASS |
