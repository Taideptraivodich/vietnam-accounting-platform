# Canonical Final Integration Gate PASS Evidence v1.0.3

The canonical source of truth for Final Integration Gate v1.0.3 is:

```text
INT01A_FINAL_PASS.json
INT01A_FINAL_PASS.md
```

Expected result:

```text
Runner: INT-01A_P0_v1.0
Status: PASS
Step count: 13
First failing step: none
Open issues: none
```

Passed steps:

```text
INT01A-00 Environment
INT01A-01 Real PostgreSQL connectivity
INT01A-02 Freeze-scope tables / migrations
INT01A-03 MD-01 seed / preseed
INT01A-04 Adapter binding
INT01A-05 Sales / Delivery
INT01A-06 Purchase / GRNI
INT01A-07 VAT linkage
INT01A-08 AR/AP settlement
INT01A-09 Inventory adjustment
INT01A-10 GL debit = credit
INT01A-11 company_id isolation
INT01A-12 Cancel / append-only reversal
```

Any older failing reports are historical diagnostics only and must not override the canonical PASS files.

If executable source, migrations, seeders, adapters, or scripts change after the PASS evidence, Final Integration Gate v1.0.3 must be rerun before production release consideration.
