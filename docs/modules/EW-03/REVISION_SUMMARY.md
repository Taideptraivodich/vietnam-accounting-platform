# REVISION_SUMMARY_EW03

Worker: EW-03 — Sales / Delivery Baseline  
Revision: v1.2 Round 2 P0 Patch  
Date: 2026-06-27  
Status: **READY FOR SENIOR RE-REVIEW**

## Senior Round 2 P0 Result Addressed

Round 2 blocked EW-03 because source/tests were present and passing, but account subtype constants did not match the frozen COA/account subtype enum.

This revision keeps the approved Sales/Delivery posting boundaries and changes only the P0 enum/account-contract alignment.

## Round 2 Patch Matrix

| P0 item | Senior requirement | Revision response |
|---|---|---|
| Account subtype enum | Replace non-frozen subtype constants | `ACCOUNT_SUBTYPES` now uses frozen values: `receivable`, `cash`, `bank`, `sales_revenue`, `vat_output`, `goods_sent_for_sale`, `cogs`, and inventory subtypes `merchandise_inventory`, `finished_goods`, `raw_material`, `tools`. |
| Cash/bank resolution | Cash sale uses cash or bank based on payment method / explicit account | `AccountContractResolver.resolveCashOrBankAccount()` accepts explicit `payment_account_id` / `cash_account_id`; otherwise maps bank payment methods to `bank`, default cash method to `cash`. |
| Canonical account reference | `account_id` field value = `accounts.id` | Resolver comments, docs, tests, and accounting-line assertions state and enforce payload `account_id` convention. |
| VAT output | Keep valid `vat_output` subtype | VAT output GL line still resolves configured `vat_output` account and sends `journal_entry_id` to EW-06. |
| COGS/inventory | Use `cogs` and item/warehouse inventory subtype family | Inventory issue valuation evidence now carries `cogs` and `merchandise_inventory`; resolver exposes inventory subtype guard for merchandise/finished/raw/tools. |
| Goods sent for sale | Keep valid `goods_sent_for_sale` subtype | Delivery Note still debits configured goods-sent account and credits inventory account(s). |
| Static evidence | No blocked legacy subtype tokens remain in source/migration | Test suite dynamically constructs forbidden tokens and scans `src/**` + `migrations/**`. |

## Preserved v1.1 Fixes

- Sales composes accounting lines and calls EW-01 `postAccountingDocument(request, tx)` / `reverseAccountingDocument(request, tx)`.
- Sales does not insert `gl_entries` directly.
- VAT output GL line is not placeholder/null.
- `invoice_updates_stock` and `delivery_then_invoice` remain supported.
- Delivery Note remains Sales-owned source document, with stock movement delegated to generic inventory issue service.
- Credit sales create AR outstanding; cash/bank sales do not.
- Cancellation remains blocked when active AR allocation exists.

## Revision Scope Control

No manufacturing, FIFO, landed cost, serial/batch, VAT return finalization, or duplicate inventory issue flow was added.
