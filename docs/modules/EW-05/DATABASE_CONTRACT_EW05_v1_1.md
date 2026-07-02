# DATABASE_CONTRACT_EW05_v1_1

## Status

EW-05 v1.1 aligns the Inventory database contract with the EW-01 / MD-01 UUID baseline.

## Inventory ledger

`inventory_ledger_entries` is the canonical append-only inventory source of truth.

Key type alignment:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
company_id UUID NOT NULL REFERENCES companies(id)
item_id UUID NOT NULL REFERENCES items(id)
warehouse_id UUID NOT NULL REFERENCES warehouses(id)
source_document_id UUID NOT NULL
source_document_line_id UUID
transfer_group_id UUID
transfer_pair_id UUID REFERENCES inventory_ledger_entries(id)
reverses_inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries(id)
```

Behavior:

```text
- INSERT only after post.
- UPDATE and DELETE are rejected by database triggers.
- Cancel uses reversal entries.
- Negative stock is blocked by default.
- Backdated post/cancel is blocked when later entries exist for the same company + item + warehouse.
```

## Stock balances

`stock_balances` is a mutable/rebuildable cache only.

```sql
company_id UUID NOT NULL REFERENCES companies(id)
item_id UUID NOT NULL REFERENCES items(id)
warehouse_id UUID NOT NULL REFERENCES warehouses(id)
last_inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries(id)
```

The service updates `stock_balances` in the same transaction boundary as the ledger insertion.

## Opening stock

`opening_stock_documents` uses UUID-compatible primary and foreign keys. It requires:

```text
opening_stock_offset_account_id
inventory_account_id
setup/opening period flag at service validation layer
```

Opening stock posts Inventory Ledger and GL atomically through EW-01 Accounting Engine.

## Inventory adjustment

`inventory_adjustments` uses UUID-compatible primary and foreign keys. It requires:

```text
adjustment_reason
offset_account_id
inventory_account_id
```

No stock value change is posted without configured accounting impact.

## GL linkage

EW-05 uses the EW-01 linkage column:

```sql
gl_entries.inventory_ledger_entry_id UUID
```

The migration only adds the UUID column if missing and then adds:

```sql
fk_gl_entries_inventory_ledger_entry_id
```

EW-05 does not create an alternate GL table, alternate posting table, or account resolver contract.
