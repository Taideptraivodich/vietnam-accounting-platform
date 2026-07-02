# Account Resolver Contract EW-01 v1.0 — Round 3 Hotfix

## 1. Canonical account reference rule

```text
Physical account primary key: accounts.id
Business payload/reference field: account_id = accounts.id
Forbidden unless separately approved: physical accounts.account_id column
```

EW-01 may return a virtual `account_id` property from resolver methods for caller convenience, but that value is always copied from `accounts.id` and is not a physical column on `accounts`.

## 2. Required account metadata

Every postable account must carry freeze-compatible metadata:

```text
account_subtype
normal_balance
requires_tax_info
requires_inventory_item
requires_warehouse
requires_party
default_party_type
is_bipolar
presentation_rule
phase_scope
accounting_regime
```

Required baseline subtypes published by EW-01:

```text
cash
bank
receivable
payable
vat_input
vat_output
sales_revenue
purchase_expense
merchandise_inventory
finished_goods
raw_material
tools
cogs
goods_sent_for_sale
goods_received_not_invoiced
equity
retained_earnings
other_asset
other_liability
other_income
other_expense
```

## 3. Resolver APIs

`AccountRepository` publishes these transaction-aware resolver methods:

```js
resolveAccountBySubtype(company_id, account_subtype, optional_dimensions, tx?)
resolveCashOrBank(company_id, payment_method, explicit_account_id?, tx?)
resolveInventoryAccount(company_id, item_id, warehouse_id, tx?)
resolveVatInputAccount(company_id, tx?)
resolveVatOutputAccount(company_id, tx?)
resolveGoodsSentForSaleAccount(company_id, tx?)
resolveGRNIAccount(company_id, supplier_id, item_id, warehouse_id, tx?)
```

All methods return an account object plus a virtual payload alias:

```js
{
  id: '<accounts.id>',
  account_id: '<same value as accounts.id>',
  account_subtype: '...',
  ...metadata
}
```

## 4. Mapping override contract

EW-01 adds `account_mappings` for module-specific resolver overrides. It maps dimensions to `accounts.id`:

```text
company_id
account_subtype
account_id        -- FK to accounts(id)
payment_method
party_type
party_id
item_id
warehouse_id
is_default
priority
is_active
```

Resolution order:

1. Explicit account ID, where allowed by the resolver.
2. Active `account_mappings` row matching company, subtype, and dimensions.
3. Company default active/postable account with matching `accounts.account_subtype`.

## 5. Module alignment examples

Sales:

```text
credit sale: receivable
cash sale: cash or bank
VAT output: vat_output
COGS: cogs
goods sent for sale: goods_sent_for_sale
```

Purchase:

```text
credit purchase: payable
direct cash/bank purchase: cash or bank
VAT input: vat_input
inventory: merchandise_inventory / finished_goods / raw_material / tools
receipt-before-invoice clearing: goods_received_not_invoiced
```

Inventory:

```text
stock asset account: resolveInventoryAccount(company_id, item_id, warehouse_id)
COGS: cogs
```

VAT ledger:

```text
EW-06 does not resolve/post GL accounts directly. It receives journal_entry_id/gl_entry_id links after EW-03/EW-04 compose VAT GL lines using EW-01 account_id values.
```
