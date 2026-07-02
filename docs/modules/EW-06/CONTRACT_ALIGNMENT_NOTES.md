# CONTRACT_ALIGNMENT_NOTES.md

EW-06 is aligned to the senior integration follow-up as follows:

```text
EW-06 writes tax_ledger_entries only.
EW-06 does not compose or insert gl_entries.
Sales/Purchase compose VAT GL lines and call Core Accounting.
EW-06 tax ledger rows link to EW-01 journal_entry_id.
Sales output VAT uses tax_direction=output.
Purchase input VAT uses tax_direction=input.
No official VAT return finalization is implemented in Worker v1.0.
```

The writer accepts the required senior field list and validates `tax_account_id` and `journal_entry_id` as mandatory.

No `chart_of_accounts` dependency is introduced. `tax_account_id` should point to the canonical `accounts` table once EW-01 publishes final FK contract.
