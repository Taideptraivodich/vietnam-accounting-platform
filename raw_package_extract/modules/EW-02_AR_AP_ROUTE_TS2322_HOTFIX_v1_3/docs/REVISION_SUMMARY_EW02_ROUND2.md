# EW-02 Round 2 Revision Summary

**Module:** EW-02 AR/AP Payment Settlement  
**Revision:** v1.2  
**Senior review input:** `EW_REVISIONS_ROUND2_SENIOR_REVIEW`  
**Scope:** P0 only. No P1/P2 features added.

## Senior P0 findings addressed

| Senior blocker | Status | Implementation evidence |
|---|---:|---|
| Write repositories are not transaction-aware | Fixed | `ledgerRepo.insertEntry(..., tx)`, `allocationRepo.insert(..., tx)`, `allocationRepo.cancel(..., tx)`, `outstandingRepo.upsert(..., tx)`, voucher repository interfaces `markPosted(..., tx)` / `markCancelled(..., tx)`. Reads used for write validation also accept `tx` so checks and writes run in the same unit of work. |
| Source + GL + AR/AP + allocation/cache not guaranteed atomic | Fixed | Service write methods wrap work with `withUnitOfWork`. If caller supplies `tx`, EW-02 reuses it. Otherwise EW-02 requires `AccountingTransactionManager` and opens a standalone transaction. |
| DB-level append-only enforcement missing | Fixed | Migration adds `ew02_forbid_ar_ap_append_only_mutation()` plus triggers that reject `UPDATE` and `DELETE` on `ar_ap_ledger_entries` and `ar_ap_allocations`. |
| Runnable TS test harness missing | Fixed | Added mergeable layout: `src/...`, `tests/...`, `package.json`, `tsconfig.json`, `jest.config.cjs`; command: `npm run verify`. |
| Preserve negative allocation cancellation event | Preserved | `allocationRepo.cancel` appends `allocation_event_type='cancelled'` with negative `allocated_amount` and `reversal_of_allocation_id`. |
| Account reference convention | Aligned | Payload/account fields such as `accountId` / `account_id` carry the value of physical `accounts.id`; EW-02 does not require a separate physical `account_id` column on `accounts`. |

## Unit-of-work rule

For integrated Sales/Purchase posting flows:

```ts
await ew02.writeInvoiceLedgerEntry({ ..., tx });
```

For standalone EW-02 voucher/allocation flows:

```ts
new ArApService(..., accountingTransactionManager)
await service.postReceiptVoucher(...)
```

If neither a caller `tx` nor `AccountingTransactionManager` exists, EW-02 write methods throw instead of silently writing outside the atomic boundary.

## No scope creep

Not added:

- FIFO / landed cost / manufacturing;
- GL direct writes from EW-02;
- separate physical `account_id` alias on `accounts`;
- mutable AR/AP event tables.
