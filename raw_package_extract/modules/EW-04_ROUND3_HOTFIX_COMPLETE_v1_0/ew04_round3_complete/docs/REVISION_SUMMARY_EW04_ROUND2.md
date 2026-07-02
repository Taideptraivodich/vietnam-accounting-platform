# EW-04 Round 2 P0 Revision Summary

## Senior blockers addressed

| Senior P0 requirement | Revision |
|---|---|
| Align account reference convention | `account_id` remains the business/reference field name, and its value is EW-01 physical `accounts.id`. EW-04 does not assume any physical account-id alias column. |
| Implement P1 direct-stock Purchase Invoice | `PurchaseInvoiceService.postInvoice()` now detects `direct_invoice_stock`, calls EW-05 stock-in inside the same transaction, and posts Dr Inventory / Dr VAT Input / Cr AP-Cash-Bank. |
| Preserve P2 Receipt before Invoice | Receipt still posts Dr Inventory / Cr GRNI; receipt-linked invoice clears GRNI with Dr GRNI / Dr VAT Input / Cr AP-Cash-Bank. |
| Do not block valid P1 | Validator now allows invoice lines without receipt links when all lines are P1 direct-stock. |
| Keep P2 guardrail | Receipt-linked P2 lines require both receipt header and receipt line references; mixed P1/P2 invoices are rejected. |
| Runnable package | Package now uses `src/modules/purchase/...`, `tests/...`, and `package.json` with `npm test`. Tests use Node built-in runner and require no install. |
| Preserve VAT/AP fixes | VAT input GL remains in EW-04. EW-06 only receives tax ledger request. Direct cash/bank PI creates no AP outstanding. |

## Stock patterns

### P1 — Purchase Invoice updates stock directly

```text
Purchase Invoice submit:
Dr Inventory
Dr VAT Input
    Cr AP / Cash / Bank
```

Rules implemented:
- EW-05 stock-in is called before GL posting and inside the same database transaction.
- GRNI is not used.
- Credit invoices create AP ledger/outstanding via EW-02.
- Cash/bank invoices do not create AP ledger/outstanding.

### P2 — Purchase Receipt before Purchase Invoice

```text
Purchase Receipt:
Dr Inventory
    Cr GRNI

Purchase Invoice:
Dr GRNI
Dr VAT Input
    Cr AP / Cash / Bank
```

Rules implemented:
- P2 invoice lines must reference both `purchase_receipt_id` and `purchase_receipt_line_id`.
- Receipt billed quantity is updated only for P2.
- GRNI subtype must be `goods_received_not_invoiced` and must not map to TK151.

