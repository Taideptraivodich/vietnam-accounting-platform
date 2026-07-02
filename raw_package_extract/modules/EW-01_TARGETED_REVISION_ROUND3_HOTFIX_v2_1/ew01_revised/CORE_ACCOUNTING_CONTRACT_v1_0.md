# Core Accounting Contract v1.0 — EW-01

## 1. Ownership boundary

Core Accounting is the **only** writer of:

```text
journal_entries
journal_entry_lines
gl_entries
```

Business modules must not insert, update, or delete `gl_entries` directly. Business modules compose accounting lines and call Core Accounting.

## 2. Required service methods

```js
postAccountingDocument(request, tx)
reverseAccountingDocument(request, tx)
```

Both methods require a transaction client `tx`. They do not open or commit a transaction themselves.

## 3. `postAccountingDocument(request, tx)` request contract

Required fields:

```js
{
  company_id: string,
  posting_date: 'YYYY-MM-DD',
  source_document_type: string,
  source_document_id: string,
  source_document_no?: string,
  idempotency_key: string,
  description?: string,
  party_type?: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER',
  party_id?: string,
  warehouse_id?: string,
  currency?: 'VND' | string,
  tax_metadata?: object,
  lines: [
    {
      account_id: string,
      debit_amount?: number | string,
      credit_amount?: number | string,
      currency?: string,
      description?: string,
      source_document_line_id?: string,
      party_type?: string,
      party_id?: string,
      warehouse_id?: string,
      inventory_item_id?: string,
      inventory_ledger_entry_id?: string,
      tax_metadata?: object
    }
  ]
}
```

Line amounts are integer minor units for VND baseline. Exactly one side of each line must be positive. Total debit must equal total credit.

## 4. Inventory/VAT support

Inventory integration has two allowed patterns:

1. Single GL line linked to one inventory event via `inventory_ledger_entry_id`.
2. Module-owned `inventory_gl_links` table created by Inventory later, using the returned `journal_entry_id` / `gl_entry_ids` from this contract.

VAT integration rule:

- Sales/Purchase compose VAT GL lines and pass them in `lines[]`.
- EW-06 owns tax ledger rows only.
- `tax_metadata` is passed through to `journal_entry_lines` and `gl_entries` for downstream tax ledger linking.

## 5. Party fields

Party-sensitive accounts set `accounts.requires_party = TRUE`. When such an account is posted, each relevant line must include:

```js
party_type
party_id
```

Examples: Customer AR, Supplier AP, employee advance accounts.

## 6. Validation behavior

Core Accounting validates:

- `company_id` exists in the call context.
- `posting_date` is present and not in a locked fiscal period.
- `source_document_type`, `source_document_id`, and `idempotency_key` are present for business documents.
- Lines exist.
- Debit equals credit.
- No zero-side lines.
- No negative amounts.
- No line has both debit and credit.
- All `account_id` values exist in canonical `accounts` for the same company and are active.
- Group / non-postable accounts are rejected.
- Required party/warehouse/inventory item/tax metadata dimensions are present based on `accounts` metadata.
- `account_id` fields are interpreted as `accounts.id`; EW-01 does not expose a physical `accounts.account_id` column.

Validation failure raises `ValidationError` with HTTP-compatible `statusCode = 422`.


## 6A. Account resolver contract

EW-01 publishes account resolver methods for business modules:

```js
resolveAccountBySubtype(company_id, account_subtype, optional_dimensions, tx?)
resolveCashOrBank(company_id, payment_method, explicit_account_id?, tx?)
resolveInventoryAccount(company_id, item_id, warehouse_id, tx?)
resolveVatInputAccount(company_id, tx?)
resolveVatOutputAccount(company_id, tx?)
resolveGoodsSentForSaleAccount(company_id, tx?)
resolveGRNIAccount(company_id, supplier_id, item_id, warehouse_id, tx?)
```

Returned `account_id` is a virtual payload alias equal to `accounts.id`. It is not a physical column on `accounts`.

See `ACCOUNT_RESOLVER_CONTRACT_EW01_v1_0.md` for the detailed resolver/mapping contract.

## 7. Idempotency behavior

`idempotency_key` is required for business posting. It is unique per company.

If a matching posted/cancelled JE already exists for the same company and idempotency key, the service returns the existing posting result and does not append duplicate GL rows.

## 8. Posting return contract

```js
{
  journal_entry_id: string,
  gl_entry_ids: string[],
  source_document_type: string,
  source_document_id: string,
  source_document_no?: string,
  status: 'POSTED' | 'CANCELLED',
  idempotent: boolean
}
```

Downstream modules must use this return value for tax ledger links, AR/AP links, inventory-GL links, audit trails, and reversal chains.

## 9. `reverseAccountingDocument(request, tx)` request contract

Required fields:

```js
{
  company_id: string,
  posting_date: 'YYYY-MM-DD',
  idempotency_key: string,
  journal_entry_id?: string,
  source_document_type?: string,
  source_document_id?: string,
  source_document_no?: string,
  description?: string,
  reason?: string
}
```

The caller must provide either:

```text
journal_entry_id
```

or:

```text
source_document_type + source_document_id
```

## 10. Reversal return contract

```js
{
  journal_entry_id: string,              // new reversal JE
  gl_entry_ids: string[],                // new reversal GL rows
  source_document_type: string,
  source_document_id: string,
  source_document_no?: string,
  status: 'POSTED',
  idempotent: boolean,
  reversal: true,
  reversal_of_journal_entry_id: string
}
```

Reversal never updates/deletes original GL rows. It appends a new JE and new GL rows with debit/credit swapped.
