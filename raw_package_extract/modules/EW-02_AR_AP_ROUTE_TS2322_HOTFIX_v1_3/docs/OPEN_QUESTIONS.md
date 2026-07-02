# EW-02 Open Questions — Revised

## 1. EW-01 final shared package/import path

EW-02 now uses EW-01 contract names:

```text
postAccountingDocument(request, tx?)
reverseAccountingDocument(request, tx?)
```

The final shared import path/package is still owned by EW-01/integration.

## 2. Concrete transaction context type

EW-02 defines `AccountingTransactionContext = unknown` until EW-01 publishes the unit-of-work type.

## 3. EW-04 direct cash/bank purchase invoice handoff

EW-04 must pass `directCashPayment = true` for purchase invoices posted directly to cash/bank accounts so EW-02 does not create AP outstanding.
