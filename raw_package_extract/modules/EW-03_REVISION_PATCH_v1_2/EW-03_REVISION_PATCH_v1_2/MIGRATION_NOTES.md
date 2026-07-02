# MIGRATION_NOTES

## Account Reference Alignment

All account references in EW-03 migration point to canonical `accounts(id)`:

```text
companies.goods_sent_for_sale_account_id -> accounts(id)
sales_invoices.payment_account_id -> accounts(id)
sales_invoices.cash_account_id -> accounts(id)
sales_invoice_lines.revenue_account_id -> accounts(id)
```

Payload convention remains:

```text
account_id field value = accounts.id
```

No physical `accounts.account_id` column is required or referenced.

## Cash / Bank Payment Account Resolution

Round 2 adds these Sales Invoice fields:

```text
payment_method
payment_account_id
```

Allowed payment methods:

```text
cash
bank_transfer
card
other_bank
```

`payment_account_id` is an explicit account reference. If no explicit payment account is supplied, `payment_method` drives the resolver to the frozen `cash` or `bank` subtype.

`cash_account_id` remains as a backward-compatible explicit account reference.

## Company Sales Pattern Setting

The company setting is:

```text
companies.sales_stock_pattern
```

Allowed values:

```text
invoice_updates_stock
delivery_then_invoice
```

This column is intentionally nullable in migration so a deployment can explicitly configure each company instead of silently relying on a global schema default.

## Shared Ledger Ownership

EW-03 migration does not create shared ledger tables. Ownership remains:

```text
GL entries: EW-01
AR/AP ledger and allocations: EW-02
Inventory ledger: EW-05
Tax ledger: EW-06
```

## VAT GL

No VAT placeholder account is stored. Sales resolves the configured `vat_output` account before calling EW-01.
