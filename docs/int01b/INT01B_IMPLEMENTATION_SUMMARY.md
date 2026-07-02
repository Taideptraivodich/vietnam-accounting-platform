# INT01B Implementation Summary

## Result

This patch adds a real INT-01A adapter binding file:

```text
src/int01a/int01a-approved-surface-adapter.mjs
```

It replaces the missing binding condition by exporting `createInt01aAdapter(context)` and returning all required methods:

```text
postSalesDelivery
postPurchaseGrni
settleArAp
postInventoryAdjustment
cancelDocument
```

## Design

The adapter is a thin approved-surface delegate. It dynamically resolves existing candidate service modules and invokes one approved service method for each INT01A operation. It does not create ledger rows, post accounting entries, calculate VAT, calculate inventory valuation, or mutate module tables directly.

## Fail-closed behavior

If a required existing surface or method is unavailable, the adapter throws a precise error naming the missing surface and all candidate paths/methods tried. This is intended to become a real downstream module-surface failure, not a fake smoke pass.

## Scope preserved

```text
Architecture Freeze v1.0: unchanged
P1/P2: not opened
EW business/accounting semantics: unchanged
INT01A runner: not bypassed
Production merge: not allowed by this patch alone
```
