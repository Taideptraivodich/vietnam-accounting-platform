# EW-04 Round 3 Test Evidence

Executed from package root:

```text
npm test
```

Result:

```text
PASS — 19/19 tests passed
```

Round 3 coverage added:

- Resolver uses canonical EW-01 `account_mappings`.
- Resolver does not query or depend on the legacy company-specific mapping table.
- `resolveGRNIAccount()` resolves `goods_received_not_invoiced`.
- Resolver returns `account_id = accounts.id` in payload-shaped account results.
- Old `grni` account subtype is rejected.

Preserved coverage:

- P1 direct-stock invoice without receipt links is accepted.
- P2 receipt-linked invoice is accepted and marked `receipt_then_invoice`.
- Partial receipt links are rejected.
- Mixed P1/P2 lines are rejected.
- P1 credit invoice calls EW-05 stock-in, debits Inventory and VAT Input, credits AP, and creates AP ledger/outstanding.
- P1 cash invoice credits cash/bank and creates no AP outstanding.
- P2 invoice clears GRNI and does not call EW-05 stock-in again.
- P1 cancellation reverses EW-05 stock-in and calls EW-01 reversal contract.

Static syntax check:

```text
npm run syntax
```

Result:

```text
PASS — all src/tests JavaScript files parse successfully
```
