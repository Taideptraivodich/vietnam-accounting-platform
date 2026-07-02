# CHANGED_FILES.md

## Changed / added files

```text
src/taxLedgerService.js
src/taxLedgerRepository.pg.js
src/taxLedgerRepository.contract.js
src/taxLedgerRoutes.js
test/taxLedgerService.test.js
test/fakeRepository.js
migrations/0001_create_tax_ledger_entries.sql
REVISION_SUMMARY_EW06.md
TAX_LEDGER_WRITER_CONTRACT.md
SALES_PURCHASE_INTEGRATION_NOTES_EW06.md
TEST_EVIDENCE_EW06.md
OPEN_QUESTIONS_EW06.md
package.json
```

## Material changes

```text
- Added senior-required writer contract.
- Added invoice_no and invoice_date fields.
- Added tax_account_id field and removed ambiguous EW-06 writer dependency on account_id.
- Added required journal_entry_id link to EW-01 posting result.
- Required reversal rows to link to reversal journal_entry_id.
- Preserved append-only behavior and idempotency.
- Added explicit no-GL-write tests.
```
