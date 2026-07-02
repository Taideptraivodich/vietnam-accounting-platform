# TEST_EVIDENCE_EW03

## Test Command

```bash
npm test
```

## Result

```text
10 tests passed / 0 failed
```

## Coverage Summary

| Test | Evidence |
|---|---|
| Credit sale debit | Verifies credit Sales Invoice debits account resolved from frozen `receivable` subtype. |
| Cash sale debit | Verifies cash payment method resolves to frozen `cash` subtype. |
| Bank sale debit | Verifies bank-transfer payment method resolves to frozen `bank` subtype. |
| Explicit account reference | Verifies explicit payment account is carried as payload `account_id` value pointing to `accounts.id`. |
| VAT output GL | Verifies VAT output GL line has `acct-vat-output-33311`, no null account, and EW-06 tax ledger receives `journal_entry_id`. |
| `invoice_updates_stock` pattern | Verifies Sales Invoice calls generic inventory issue and includes `cogs` + `merchandise_inventory` valuation lines. |
| `delivery_then_invoice` pattern | Verifies Sales Invoice does not call inventory issue. |
| Delivery Note boundary | Verifies Delivery Note uses generic inventory issue, `goods_sent_for_sale`, and merchandise inventory account mapping. |
| Cancellation dependency | Verifies active AR allocation blocks Sales Invoice cancellation. |
| Static subtype evidence | Verifies source/migration has no direct `gl_entries` insert, no legacy COA table, and no blocked subtype tokens. |

## Captured Test Output

```text
TAP version 13
ok 1 - credit sale debits frozen receivable subtype mapping
ok 2 - cash sale debits frozen cash subtype mapping when payment method is cash
ok 3 - cash sale debits frozen bank subtype mapping when payment method is bank transfer
ok 4 - cash sale accepts explicit account_id value that points to accounts.id
ok 5 - Sales Invoice composes VAT output GL with configured account_id and calls EW-01 postAccountingDocument
ok 6 - invoice_updates_stock pattern calls generic inventoryIssueService.postIssue and includes cogs and merchandise_inventory lines
ok 7 - delivery_then_invoice Sales Invoice does not post inventory issue
ok 8 - Delivery Note uses goods_sent_for_sale and merchandise inventory account mappings
ok 9 - Sales Invoice cancellation is blocked when active AR allocation exists
ok 10 - static evidence: source and migrations use only frozen subtype enum values
1..10
# tests 10
# pass 10
# fail 0
```
