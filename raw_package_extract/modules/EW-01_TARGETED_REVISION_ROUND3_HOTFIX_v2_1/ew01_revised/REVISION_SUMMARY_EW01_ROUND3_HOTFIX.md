# Revision Summary — EW-01 Round 3 Hotfix

## Scope

Applied the senior Round 3 P0 hotfix for EW-01 only.

## Hotfix implemented

EW-01 now publishes the canonical receipt-before-invoice clearing account subtype as:

```text
goods_received_not_invoiced
```

No compatibility alias is introduced or approved in this EW-01 package.

## Files changed

```text
migrations/001_gl_foundation.sql
src/repositories/AccountRepository.js
DATABASE_CONTRACT_EW01_v1_0.md
ACCOUNT_RESOLVER_CONTRACT_EW01_v1_0.md
tests/run_unit_tests.js
TEST_EVIDENCE_EW01.md
README.md
CHANGED_FILES.md
```

## Contract impact

- `accounts.account_subtype` CHECK includes `goods_received_not_invoiced`.
- `resolveGRNIAccount()` resolves accounts with subtype `goods_received_not_invoiced`.
- Resolver payload continues to return `account_id = accounts.id` as a virtual alias.
- Physical schema remains `accounts.id` only; no physical `accounts.account_id` column is introduced.
- Existing `account_mappings` table remains the canonical resolver mapping table.

## Preserved

```text
postAccountingDocument(request, tx)
reverseAccountingDocument(request, tx)
caller-owned transaction boundary
GL append-only enforcement
reversal-by-new-JE/new-GL-rows
```

## Test result

```text
15/15 tests passed
```
