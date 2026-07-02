# EW-04 Account Contract Alignment — Round 2

Senior decision implemented:

```text
Physical PK: EW-01 accounts.id
Business/reference field: account_id = accounts.id
No physical account-id alias column is assumed by EW-04.
```

## Resolver behavior

`PurchaseAccountResolver` resolves posting accounts by frozen account subtypes:

- Inventory: `raw_material`, `tools`, `finished_goods`, `merchandise_inventory`
- GRNI: `goods_received_not_invoiced`
- Payable: `payable`
- VAT input: `vat_input`
- Direct cash/bank: `cash` or `bank`

All GL lines are built with `account_id` payload fields whose values are EW-01 account row IDs.

## GRNI guardrails

GRNI must satisfy:

```text
account_subtype = goods_received_not_invoiced
requires_party = true
default_party_type = supplier
requires_inventory_item = true
requires_warehouse = true
not TK151
```
