# Contract Alignment Notes — EW-02

## EW-01 Accounts Contract

EW-02 uses canonical account identifiers only:

```text
accountId / account_id payload value => accounts.id
```

Voucher fields remain:

```text
receipt_vouchers.debit_account_id
receipt_vouchers.credit_account_id
payment_vouchers.debit_account_id
payment_vouchers.credit_account_id
```

These are foreign-key candidates to EW-01 `accounts.id` when the integrated schema is assembled. EW-02 does not introduce or reference `chart` + `_of_` + `accounts`.

## EW-01 GL Posting Contract

Receipt and Payment vouchers compose accounting lines and call EW-01:

```text
postAccountingDocument(request, tx?)
reverseAccountingDocument(request, tx?)
```

EW-02 does not insert, update, or delete GL rows directly.

## Transaction Boundary

EW-02 declares an `AccountingTransactionContext` type so the integrated application service can pass the same unit-of-work/transaction to:

```text
EW-01 postAccountingDocument / reverseAccountingDocument
EW-02 AR/AP ledger repository
EW-02 allocation repository
EW-02 outstanding cache repository
```

The standalone module does not open isolated GL transactions.

## AR/AP Source of Truth

```text
ar_ap_ledger_entries = monetary AR/AP events
ar_ap_allocations    = settlement/allocation events
ar_ap_outstanding_cache = derived rebuildable cache
```

`ar_ap_outstanding_cache` may be updated or rebuilt, but it must never be treated as the source of truth.

## Direct Cash/Bank Purchase Invoice

For purchase invoices paid directly to 111/112, EW-04 must call EW-02 with:

```text
directCashPayment = true
```

EW-02 then creates no AP ledger entry and no outstanding cache row, so a later Payment Voucher cannot settle that invoice through AR/AP allocation.
