# EW-04 Purchase / GRNI — Round 3 Integration Cleanup Hotfix

This package applies the Senior Merge Gate Round 3 EW-04 integration cleanup:

- `PurchaseAccountResolver` now uses canonical EW-01 `account_mappings`.
- EW-04 no longer introduces or depends on the legacy company-specific mapping table.
- `account_id` business/reference fields still carry EW-01 physical `accounts.id` values.
- GRNI subtype remains `goods_received_not_invoiced`; the old `grni` subtype is rejected.
- VAT input GL is still composed by EW-04; EW-06 only writes VAT ledger entries.
- Direct cash/bank Purchase Invoice creates no AP outstanding.
- P1 direct-stock Purchase Invoice remains supported.
- P2 Receipt-before-Invoice and GRNI clearing remain supported.

## Run tests

```bash
npm test
npm run syntax
```

No npm dependency install is required for the included unit tests; they use Node's built-in test runner.
