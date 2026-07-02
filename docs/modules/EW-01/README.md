# EW-01 Targeted Revision Patch v2.1 — Round 3 Hotfix

This package revises EW-01 Core Accounting / GL according to the senior Round 3 P0 hotfix request.

Primary Round 3 fix:

```text
goods_received_not_invoiced is the canonical receipt-before-invoice clearing account_subtype
```

No compatibility alias is introduced in this package.

Preserved from earlier rounds:

```text
accounts metadata contract
accounts.id / account_id convention
account resolver / account mapping contract
GL posting service contract
caller-owned transaction boundary
append-only GL enforcement
reversal-by-new-JE/new-GL-rows
```

Main outputs:

- `REVISION_SUMMARY_EW01_ROUND3_HOTFIX.md`
- `REVISION_SUMMARY_EW01_ROUND2.md`
- `ACCOUNT_RESOLVER_CONTRACT_EW01_v1_0.md`
- `CORE_ACCOUNTING_CONTRACT_v1_0.md`
- `DATABASE_CONTRACT_EW01_v1_0.md`
- `TRANSACTION_BOUNDARY_CONTRACT_v1_0.md`
- `APPEND_ONLY_ENFORCEMENT_EVIDENCE.md`
- `TEST_EVIDENCE_EW01.md`
- `OPEN_QUESTIONS_EW01.md`

Run tests:

```bash
node tests/run_unit_tests.js
```
