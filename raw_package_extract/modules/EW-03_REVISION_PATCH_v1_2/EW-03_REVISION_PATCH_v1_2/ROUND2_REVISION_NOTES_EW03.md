# ROUND2_REVISION_NOTES_EW03

## Scope

This patch addresses only EW-03 Round 2 P0: align account subtype constants/resolver/tests with the frozen COA enum and the canonical account reference convention.

## Files changed

```text
src/sales/constants.js
src/sales/services/AccountContractResolver.js
src/sales/models/SalesInvoice.js
src/sales/services/SalesPostingService.js
src/sales/index.js
tests/salesPostingService.test.js
package.json
CONTRACT_ALIGNMENT_NOTES_EW03.md
SALES_POSTING_FLOW_EVIDENCE.md
OPEN_QUESTIONS_EW03.md
REVISION_SUMMARY_EW03.md
TEST_EVIDENCE_EW03.md
```

## Verification

```text
npm test
10 tests passed / 0 failed
```

The static test scans `src/**` and `migrations/**` to prove the blocked legacy subtype tokens are absent from implementation and migration files.
