# Changed Files — EW-01 Round 3 Hotfix

## Schema

- `migrations/001_gl_foundation.sql`
  - changed canonical receipt-before-invoice clearing subtype to `goods_received_not_invoiced`
  - refreshed `accounts_valid_subtype` CHECK for upgrade-safe deployments
  - preserved `accounts.id` as physical PK and `account_id = accounts.id` payload convention
  - preserved `account_mappings` as the canonical resolver mapping table
  - preserved GL append-only triggers and transaction-compatible schema

## Code

- `src/repositories/AccountRepository.js`
  - updated `resolveGRNIAccount()` to resolve subtype `goods_received_not_invoiced`
  - preserved virtual `account_id = accounts.id` payload alias

## Tests

- `tests/run_unit_tests.js`
  - added CHECK-contract evidence for `goods_received_not_invoiced`
  - added resolver evidence for `resolveGRNIAccount()` returning `account_id = accounts.id`
  - expanded from 13 to 15 evidence tests

## Docs

- `DATABASE_CONTRACT_EW01_v1_0.md`
  - updated baseline subtype list
- `ACCOUNT_RESOLVER_CONTRACT_EW01_v1_0.md`
  - updated resolver contract and purchase alignment example
- `TEST_EVIDENCE_EW01.md`
  - updated Round 3 test evidence
- `REVISION_SUMMARY_EW01_ROUND3_HOTFIX.md`
  - added this hotfix summary
- `README.md`
  - updated package scope to v2.1 Round 3 hotfix
