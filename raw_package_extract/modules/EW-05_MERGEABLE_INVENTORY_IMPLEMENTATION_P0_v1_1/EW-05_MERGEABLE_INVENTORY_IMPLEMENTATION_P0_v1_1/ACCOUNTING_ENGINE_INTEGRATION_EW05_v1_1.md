# ACCOUNTING_ENGINE_INTEGRATION_EW05_v1_1

## Canonical EW-01 call

EW-05 v1.1 calls the EW-01 Accounting Engine through:

```js
accountingEngine.postAccountingDocument(request, tx)
```

EW-05 no longer calls the legacy/local `accountingEngine.post()` shape.

## Request payload

Inventory composes the Accounting Engine request with canonical snake_case keys only:

```js
{
  company_id,
  posting_date,
  source_document_type,
  source_document_id,
  idempotency_key,
  lines: [
    {
      account_id,
      debit_amount,
      credit_amount,
      inventory_item_id,
      warehouse_id,
      inventory_ledger_entry_id
    }
  ]
}
```

`tx` is passed as the second argument so Inventory Ledger, stock balance cache, and GL commit atomically in the caller's transaction boundary.

## Monetary units

Inventory valuation fields remain `NUMERIC` because Moving Average valuation requires decimal precision:

```text
valuation_rate
stock_value
stock_value_difference
```

Before GL posting, EW-05 converts `stock_value_difference` to deterministic integer minor units expected by EW-01 `BIGINT` GL amounts:

```text
debit_amount = integer minor units
credit_amount = integer minor units
```

Conversion rule:

```text
round to nearest integer VND minor unit with Math.round()
reject non-zero valuation differences that round to zero
reject values outside JavaScript safe integer range before sending to EW-01
```

## Accounting direction

Positive inventory value difference:

```text
Dr inventory_account_id
Cr offset_account_id
```

Negative inventory value difference:

```text
Dr offset_account_id
Cr inventory_account_id
```

Each GL line carries:

```text
inventory_ledger_entry_id
inventory_item_id
warehouse_id
```
