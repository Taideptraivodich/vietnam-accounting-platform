# TAX_LEDGER_WRITER_CONTRACT.md — EW-06 Tax Ledger Writer Contract

## 1. Responsibility boundary

EW-06 owns only the VAT tax ledger:

```text
EW-06 writes tax_ledger_entries only.
EW-06 does not compose or insert gl_entries.
Sales/Purchase compose VAT GL lines and call Core Accounting.
```

EW-06 must be called after EW-01 returns the GL posting result, because each tax ledger row must link to `journal_entry_id`.

## 2. Canonical writer function

```js
await taxLedgerService.writeTaxLedgerEntry({
  company_id,
  source_document_type,
  source_document_id,
  source_document_line_id,
  posting_date,
  invoice_no,
  invoice_date,
  party_type,
  party_id,
  tax_direction,
  tax_rate,
  taxable_amount,
  tax_amount,
  tax_account_id,
  journal_entry_id,

  // Optional EW-06 baseline metadata
  tax_type,
  tax_category,
  currency,
  idempotency_key,
});
```

## 3. Required fields

| Field | Required | Owner / source |
|---|---:|---|
| `company_id` | Yes | Business document context |
| `source_document_type` | Yes | Sales/Purchase caller |
| `source_document_id` | Yes | Sales/Purchase source document |
| `source_document_line_id` | Yes | Sales/Purchase source document line |
| `posting_date` | Yes | Posting service/application service |
| `invoice_no` | Yes | Sales/Purchase invoice |
| `invoice_date` | Yes | Sales/Purchase invoice |
| `party_type` | Yes | Sales/Purchase caller |
| `party_id` | Yes | Sales/Purchase caller |
| `tax_direction` | Yes | Sales=`output`, Purchase=`input` |
| `tax_rate` | Yes | Source tax metadata |
| `taxable_amount` | Yes | Source tax metadata |
| `tax_amount` | Yes | Source tax metadata |
| `tax_account_id` | Yes | Sales/Purchase account mapping result |
| `journal_entry_id` | Yes | EW-01 posting/reversal result |

## 4. Validation rules

```text
company_id is mandatory.
source_document_type/source_document_id/source_document_line_id are mandatory.
invoice_no and invoice_date are mandatory.
party_type and party_id are mandatory.
tax_direction must be input or output.
tax_account_id is mandatory; EW-06 does not map VAT accounts itself.
journal_entry_id is mandatory; EW-06 must link to EW-01 posting result.
tax_type, if supplied, must be vat.
```

Lines with `tax_amount = 0` are skipped as non-taxable and do not create tax ledger rows.

## 5. Idempotency

Default idempotency key:

```text
{source_document_type}:{source_document_id}:{source_document_line_id}:{tax_direction}
```

For reversal rows:

```text
{source_document_type}:{source_document_id}:{source_document_line_id}:{tax_direction}:reversal
```

The DB enforces uniqueness on `idempotency_key`. The repository uses `ON CONFLICT (idempotency_key) DO NOTHING` and re-selects the existing row, so retries are safe.

## 6. Transaction behavior

The Postgres repository accepts a query executor object, such as a Pool, Client, or existing transaction client.

EW-06 does not open, commit, or rollback its own transaction. Sales/Purchase should call EW-06 inside the same transaction/unit-of-work as:

```text
source document state change
EW-01 GL posting
AR/AP side effect, if applicable
inventory side effect, if applicable
tax ledger write
```

## 7. Reversal behavior

`reverseForSourceDocument(...)` inserts new reversal tax ledger rows. It never updates or deletes original rows.

Required reversal input:

```js
await taxLedgerService.reverseForSourceDocument({
  companyId,
  sourceDocumentType,
  sourceDocumentId,
  postingDate,
  journalEntryId, // reversal journal from EW-01
});
```

The reversal tax ledger row links to the reversal `journalEntryId`, not the original posting journal.
