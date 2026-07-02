# OPEN_ISSUES — EW-05 Mergeable Inventory Implementation P0 v1.1

## P0 / blockers outside delivered package

| ID | Severity | Classification | Issue | Handling |
|---|---:|---|---|---|
| EW05-V11-P0-001 | P0 | Integration environment unavailable | The sandbox does not include the full executable EW-01/EW-06/EW-02/MD-01 integrated repo or runtime PostgreSQL migration runner, so EW-05 cannot execute a real cross-package migration apply here. | No workaround. v1.1 migration and contract tests were patched to align with EW-01 UUID and Accounting Engine contract. INT-01 must rerun with the complete direct-upload bundle. |
| EW05-V11-P0-002 | P0 | Source document FK specificity | Freeze Scope requires `source_document_type` + `source_document_id`, but the complete source document table set across Sales/Purchase/Stock documents is not present in this package. | No workaround. `source_document_id` and `source_document_line_id` are UUID-compatible, but EW-05 does not add cross-module FKs without the accepted source document schemas. |

## Resolved from v1.0 Senior Review

| Previous blocker | Resolution |
|---|---|
| ID type mismatch with EW-01 / MD-01 | Resolved by UUID columns and plain UUID runtime IDs. |
| GL linkage FK incompatible | Resolved by UUID `inventory_ledger_entries.id` and UUID `gl_entries.inventory_ledger_entry_id` FK. |
| Accounting Engine call contract mismatch | Resolved by `postAccountingDocument(request, tx)`. |
| CamelCase/non-contract GL payload | Resolved by snake_case EW-01 request and line keys. |
| Decimal GL amounts | Resolved by integer minor-unit `debit_amount` / `credit_amount`. |

## Non-blocking notes

| ID | Severity | Classification | Note |
|---|---:|---|---|
| EW05-V11-NB-001 | Info | Warehouse transfer accounting | Warehouse transfers create paired inventory ledger rows and do not create company-level GL lines because total company stock value does not change. |
| EW05-V11-NB-002 | Info | Opening stock document shape | `opening_stock_documents` is implemented as a minimal item/warehouse document matching Freeze Scope. Bulk/multi-line UI workflows are not implemented. |
| EW05-V11-NB-003 | Info | Inventory adjustment document shape | `inventory_adjustments` is implemented as a minimal item/warehouse adjustment. Workflow approval, batch/serial, and advanced reason taxonomy are intentionally absent. |
