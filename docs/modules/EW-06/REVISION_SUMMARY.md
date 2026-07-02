# REVISION_SUMMARY_EW06.md — EW-06 Targeted Revision

Worker: EW-06  
Module: VAT Ledger Baseline  
Senior result addressed: PASS WITH INTEGRATION FOLLOW-UP  
Revision status: READY FOR EW-03/EW-04 WIRING AFTER EW-01 CONTRACT IS STABLE

## 1. Senior follow-up items addressed

### Follow-up 1 — Confirm EW-06 does not write GL

Confirmed and enforced:

```text
EW-06 writes tax_ledger_entries only.
EW-06 does not compose or insert gl_entries.
Sales/Purchase compose VAT GL lines and call Core Accounting.
```

Implementation evidence:

- `src/taxLedgerService.js` exposes tax ledger writer methods only.
- `src/taxLedgerRepository.pg.js` inserts only into `tax_ledger_entries`.
- No `insert into gl_entries`, `update gl_entries`, or `delete from gl_entries` exists in EW-06 source files.
- Test `EW-06 code has no direct GL insert/write responsibility` verifies this boundary.

### Follow-up 2 — Define tax ledger writer interface

Added `writeTaxLedgerEntry(input)` in `src/taxLedgerService.js`.

Required senior fields accepted and validated:

```text
company_id
source_document_type
source_document_id
source_document_line_id
posting_date
invoice_no
invoice_date
party_type
party_id
tax_direction
tax_rate
taxable_amount
tax_amount
tax_account_id
journal_entry_id
```

Additional baseline fields still supported: `tax_type`, `tax_category`, `currency`, `is_reversal`, `reversal_of_entry_id`, `idempotency_key`.

### Follow-up 3 — Link to posting result

Added required `journal_entry_id` field to:

- writer contract validation
- migration schema
- repository insert
- fake repository
- reversal flow
- tests

Normal tax rows link to the `journal_entry_id` returned by EW-01 `postAccountingDocument`.
Reversal rows link to the reversal/cancellation `journal_entry_id` returned by EW-01 reversal posting.

### Follow-up 4 — Prepare EW-03/EW-04 integration notes

Added `SALES_PURCHASE_INTEGRATION_NOTES_EW06.md`.

Rules documented:

```text
Sales Invoice output tax → tax_direction=output
Purchase Invoice input tax → tax_direction=input
No official VAT return finalization in Worker v1.0
```

## 2. Code changes

- Added canonical writer method: `writeTaxLedgerEntry(input)`.
- Kept compatibility hooks: `recordVatOutput`, `recordVatInput`, `reverseForSourceDocument`.
- Added required invoice metadata: `invoice_no`, `invoice_date`.
- Replaced ambiguous `account_id` in EW-06 tax ledger payload with `tax_account_id`.
- Added required `journal_entry_id` link to EW-01 posting result.
- Repository can use a Pool, Client, or transaction query executor; it never opens an isolated transaction.
- Moved files into expected package layout: `src/`, `test/`, `migrations/`.

## 3. Scope control

Not implemented:

```text
- Full official VAT return finalization
- GL posting or GL writing
- VAT account mapping resolution
- Advanced VAT/valuation tax scope
- Sales/Purchase source module wiring in EW-06 package
```

EW-06 remains a tax ledger writer package. Final runtime wiring belongs to EW-03/EW-04 after EW-01 publishes the stable posting contract.

## 4. Test result

Command:

```bash
npm test
```

Result:

```text
13 / 13 PASS
```
