# Open Questions — EW-02 Revision

## 1. EW-01 final TypeScript package name

EW-02 now aligns to the function names:

```text
postAccountingDocument(request, tx?)
reverseAccountingDocument(request, tx?)
```

The final import path/package name is still owned by EW-01/integration.

## 2. Transaction context concrete type

EW-02 declares:

```text
AccountingTransactionContext = unknown
```

Integration should replace this with the EW-01 unit-of-work / DB transaction client type once published.

## 3. Direct cash/bank purchase invoice handoff with EW-04

EW-04 must call EW-02 invoice ledger writer with:

```text
directCashPayment = true
```

for purchase invoices posted directly to cash/bank accounts 111/112.
