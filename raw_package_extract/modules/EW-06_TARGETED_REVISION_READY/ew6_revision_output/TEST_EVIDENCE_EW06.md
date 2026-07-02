# TEST_EVIDENCE_EW06.md

Test runner: Node built-in `node:test`  
Command: `npm test`  
Result: `13 / 13 PASS`

## Raw output

```text
TAP version 13
# Subtest: Writer contract accepts all senior-required fields and links journal_entry_id
ok 1 - Writer contract accepts all senior-required fields and links journal_entry_id
# Subtest: Writer rejects missing journal_entry_id because tax ledger must link EW-01 posting result
ok 2 - Writer rejects missing journal_entry_id because tax ledger must link EW-01 posting result
# Subtest: Writer rejects missing tax_account_id and does not map VAT account itself
ok 3 - Writer rejects missing tax_account_id and does not map VAT account itself
# Subtest: VAT output: Sales Invoice creates output tax ledger entries linked to EW-01 journal
ok 4 - VAT output: Sales Invoice creates output tax ledger entries linked to EW-01 journal
# Subtest: VAT input: Purchase Invoice creates input tax ledger entries linked to EW-01 journal
ok 5 - VAT input: Purchase Invoice creates input tax ledger entries linked to EW-01 journal
# Subtest: VAT input is posted only when tax metadata exists
ok 6 - VAT input is posted only when tax metadata exists
# Subtest: Non-taxable invoice line does not create a VAT tax entry
ok 7 - Non-taxable invoice line does not create a VAT tax entry
# Subtest: Idempotent retry: posting the same invoice twice does not duplicate entries
ok 8 - Idempotent retry: posting the same invoice twice does not duplicate entries
# Subtest: Cancellation reversal creates reversal entries linked to reversal journal_entry_id
ok 9 - Cancellation reversal creates reversal entries linked to reversal journal_entry_id
# Subtest: Cancellation reversal is idempotent on retry
ok 10 - Cancellation reversal is idempotent on retry
# Subtest: Company isolation and taxDirection filter
ok 11 - Company isolation and taxDirection filter
# Subtest: Append-only enforcement: repositories expose no update/delete and SQL blocks mutation
ok 12 - Append-only enforcement: repositories expose no update/delete and SQL blocks mutation
# Subtest: EW-06 code has no direct GL insert/write responsibility
ok 13 - EW-06 code has no direct GL insert/write responsibility
1..13
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

## Acceptance evidence mapping

| Acceptance criterion | Evidence | Result |
|---|---|---|
| Tax ledger writer interface is clear | `writeTaxLedgerEntry(input)` and `TAX_LEDGER_WRITER_CONTRACT.md` | PASS |
| No GL write responsibility exists in EW-06 | Source scan test verifies no direct `gl_entries` insert/update/delete | PASS |
| `tax_ledger_entries` links to `journal_entry_id` | Migration + repository + writer validation + tests | PASS |
| Sales/Purchase can call EW-06 after GL posting result | Integration notes and examples include EW-01 posting result flow | PASS |
| Sales output tax direction | Sales example and `recordVatOutput` use `tax_direction=output` | PASS |
| Purchase input tax direction | Purchase example and `recordVatInput` use `tax_direction=input` | PASS |
| No official VAT return finalization | Not implemented; documented as non-scope | PASS |
| Append-only tax ledger | Repository has no update/delete; SQL has update/delete blocking triggers | PASS |
| Idempotent retry | Idempotency test passes | PASS |
| Reversal is append-only | Reversal inserts new negative row and preserves original | PASS |

## Known test limitation

The tests run against an in-memory fake repository, plus source/SQL inspections. A live PostgreSQL migration test should still be run in the integrated environment to verify trigger and privilege behavior with the actual runtime DB role.
