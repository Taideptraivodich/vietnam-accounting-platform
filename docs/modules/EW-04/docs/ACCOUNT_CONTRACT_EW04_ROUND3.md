# EW-04 Account Contract Alignment — Round 3

## Account identity convention

```text
Physical PK: EW-01 accounts.id
Business/reference field: account_id = accounts.id
No physical account-id alias column is assumed by EW-04.
```

## Canonical mapping table

EW-04 now resolves configured posting accounts from the canonical EW-01 table:

```text
account_mappings
```

Expected fields used by EW-04:

```text
company_id
mapping_key
account_id     -- value is EW-01 accounts.id
```

EW-04 does not use the legacy company-specific mapping table.

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

The old subtype `grni` is not accepted by EW-04.
