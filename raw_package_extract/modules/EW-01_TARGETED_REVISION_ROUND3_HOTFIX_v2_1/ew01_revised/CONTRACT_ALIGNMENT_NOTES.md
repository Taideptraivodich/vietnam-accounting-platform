# Contract Alignment Notes — EW-01

## Canonical account table

All modules must use:

```text
accounts
accounts.id as account_id
```

No dependency on `chart_of_accounts` is approved in this patch.

## GL writer boundary

Other modules must not write `gl_entries` directly. Required flow:

```text
Business module composes GL lines -> Core Accounting validates -> Core Accounting appends JE/GL rows
```

## Shared service methods

```js
postAccountingDocument(request, tx)
reverseAccountingDocument(request, tx)
```

## Return references for downstream modules

Use:

```text
journal_entry_id
gl_entry_ids
source_document_type
source_document_id
source_document_no
status
```

## VAT alignment

Sales/Purchase compose VAT GL lines. EW-06 writes tax ledger rows and links them using the posting result.

## Inventory alignment

Use `inventory_ledger_entry_id` for direct line-to-event linkage. Use returned `gl_entry_ids` for Inventory-owned `inventory_gl_links` if many-to-many linkage is needed.
