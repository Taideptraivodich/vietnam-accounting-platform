# LOCAL_ASSEMBLY_OPEN_ISSUES.md

| Issue ID | Module | Severity | Blocker | Senior decision needed |
|---|---|---:|---:|---|
| INT01_EXECUTABLE_RUNNER_MISSING | INT-01 / Integration | P0 | yes | Provide executable INT-01 runner/adapters, or explicitly authorize a strictly mechanical runner that wires existing module APIs/commands without adding business logic. |
| MD01_SEED_ENV_IDS_REQUIRED | MD-01 / ENV | P0 for local run until supplied | yes for ENV+INT execution | Confirm deterministic local company/account IDs or provide approved pre-seed/setup step that creates EW-01 company/accounts before MD-01 seed. |

## Details

### INT01_EXECUTABLE_RUNNER_MISSING

The uploaded `INT-01_COMPLETED.zip` contains `INTEGRATION_HARNESS.md`, smoke-test report artifacts, final recommendation, and open-issues documents. It does not contain an executable cross-module smoke runner, adapters, CLI, or API-call sequence. Implementing a real end-to-end smoke runner would require significant test/adaptor logic, so it was not created by LOCAL-ASSEMBLY-01.

### MD01_SEED_ENV_IDS_REQUIRED

`seed_master_data_baseline.js` requires `DATABASE_URL`, `MD01_COMPANY_ID`, `MD01_INVENTORY_ACCOUNT_ID`, `MD01_COGS_ACCOUNT_ID`, `MD01_REVENUE_ACCOUNT_ID`, and `MD01_EXPENSE_ACCOUNT_ID`. `.env.integration.example` includes placeholders only. The ENV+INT operator must replace them with real local PostgreSQL IDs from approved EW-01 setup; no fake IDs were generated.

## Non-issues / resolved mechanical items

- Package checksums verified successfully.
- No non-mechanical source file conflict was found while merging `src/` content.
- No migration was dropped.
- MD-01 seed and INT-01 harness artifacts were retained.
- P1/P2 scope was not opened.
