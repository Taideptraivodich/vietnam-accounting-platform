# Revision Summary — EW-01 Round 2 P0

## Senior request applied

Senior Round 2 status for EW-01: **NEED REVISION — P0**.

Required changes implemented in this package:

| Senior P0 request | Result |
|---|---:|
| Expand canonical `accounts` schema/contract with freeze metadata | Done |
| Confirm `accounts.id` physical PK and `account_id = accounts.id` payload rule | Done |
| Do not add physical `accounts.account_id` | Done |
| Publish account resolver / account mapping contract | Done |
| Update database contract and migration | Done |
| Keep GL append-only triggers and transaction contract | Done |

## Code changes

- Extended `AccountRepository` with resolver methods:
  - `resolveAccountBySubtype`
  - `resolveCashOrBank`
  - `resolveInventoryAccount`
  - `resolveVatInputAccount`
  - `resolveVatOutputAccount`
  - `resolveGoodsSentForSaleAccount`
  - `resolveGRNIAccount`
- Added virtual resolver return alias `account_id = accounts.id` without adding a physical `accounts.account_id` column.
- Extended posting line passthrough with `inventory_item_id` so `requires_inventory_item` can be enforced and propagated to JE/GL rows.
- Extended validator to enforce:
  - `requires_tax_info`
  - `requires_inventory_item`
  - `requires_warehouse`
  - `requires_party`
  - `default_party_type` consistency

## Schema changes

- Expanded `accounts` with:
  - `account_subtype`
  - `normal_balance`
  - `requires_tax_info`
  - `requires_inventory_item`
  - `requires_warehouse`
  - `requires_party`
  - `default_party_type`
  - `is_bipolar`
  - `presentation_rule`
  - `phase_scope`
  - `accounting_regime`
- Added `account_mappings` resolver override table.
- Added `inventory_item_id` to `journal_entry_lines` and `gl_entries`.
- Kept existing GL append-only trigger enforcement unchanged.
- Kept shared transaction boundary unchanged: `postAccountingDocument(request, tx)` and `reverseAccountingDocument(request, tx)` still require caller `tx`.

## Test result

```text
13/13 tests passed
```
