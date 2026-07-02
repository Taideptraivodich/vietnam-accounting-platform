# OPEN_QUESTIONS_EW03

These are integration confirmations, not EW-03 blockers for targeted revision.

## OQ-01 — EW-01 final request/response field names

EW-03 calls:

```text
postAccountingDocument(request, tx)
reverseAccountingDocument(request, tx)
```

Need EW-01 final confirmation of exact result field names, especially `journal_entry_id`, validation error format and idempotency semantics.

## OQ-02 — Transaction helper name

EW-03 currently accepts injected:

```text
transactionManager.withTransaction(fn)
```

If EW-01 publishes a different unit-of-work helper name/signature, wiring should adapt at composition root only. Business logic already accepts `tx` and does not open isolated transactions.

## OQ-03 — Account settings repository/table contract

EW-03 expects company account mappings by frozen subtype:

```text
receivable
cash
bank
sales_revenue
vat_output
goods_sent_for_sale
cogs
merchandise_inventory
finished_goods
raw_material
tools
```

EW-01 should confirm the final table/view or service used to resolve account subtype to `account_id`, where `account_id` stores `accounts.id`.

## OQ-04 — Inventory issue valuation return shape

EW-03 expects generic inventory issue to return either:

```text
accounting_lines[]
```

for Sales Invoice stock issue, or:

```text
total_stock_value + inventory_credit_lines[]
```

for Delivery Note goods-sent interim posting. If EW-05 standardizes a different shape, adapter-only changes are needed.

## OQ-05 — Source document number generation

This revision preserves simple source-document number fields. Production-grade legal numbering remains outside freeze scope unless Senior opens a separate change request.
