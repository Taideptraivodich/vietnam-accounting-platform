# README — Run INT-01A Executable Cross-Module Smoke Runner

## Purpose

This package adds the executable INT-01A smoke runner required by Final Integration Gate v1.0.3. It validates the freeze-scope baseline across GL, VAT, AR/AP, Inventory, Sales/Delivery, Purchase/GRNI, and cancel/reversal using a real PostgreSQL database.

The runner does not implement accounting business logic. It only calls approved module surfaces already present in the assembled local candidate tree and verifies database invariants from their output.

## Install into candidate tree

1. Copy `src/int01a/int01a-smoke-runner.mjs` into the candidate source tree.
2. Add the scripts/dependency from `package.json` or apply `package.json.patch` manually.
3. Install dependencies if `pg` is not already present:

```bash
npm install
```

4. Create a local approved-surface adapter in the candidate tree, normally:

```bash
cp src/int01a/int01a-approved-surface-adapter.example.mjs src/int01a/int01a-approved-surface-adapter.mjs
```

Then replace the example `throw` statements with calls to existing approved APIs/services/commands only. Do not add business logic.

## Preconditions

Run this only after LOCAL-ASSEMBLY-01 has completed these steps:

1. Disposable Docker/local PostgreSQL is running.
2. Clean empty database has been created.
3. Ordered migrations have been applied for EW-01, EW-06, EW-02, EW-05, EW-03, EW-04, MD-01, and any INT-01A harness tables if present.
4. MD01/EW01 deterministic preseed has completed.
5. MD-01 seed has completed.
6. Real IDs have been exported to `.env.integration.local` or the shell.

## Run

```bash
set -a
source .env.integration.local
set +a
npm run int01a:smoke
```

Or explicitly:

```bash
NODE_ENV=integration \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vap_int01a \
MD01_COMPANY_ID=<real-company-id> \
MD01_INVENTORY_ACCOUNT_ID=<real-account-id> \
MD01_COGS_ACCOUNT_ID=<real-account-id> \
MD01_REVENUE_ACCOUNT_ID=<real-account-id> \
MD01_EXPENSE_ACCOUNT_ID=<real-account-id> \
INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs \
npm run int01a:smoke
```

## Output

The runner writes both:

```text
reports/int01a/int01a-smoke-result-<run-id>.json
reports/int01a/INT01A_SMOKE_TEST_RESULT_<run-id>.md
```

It exits `0` only when all mandatory invariants pass. It exits non-zero for missing env, unreachable DB, missing seed, missing approved surface binding, missing source document IDs, unbalanced GL, missing VAT/AR/AP/inventory rows, missing company isolation, missing inventory↔GL linkage, or invalid reversal behavior.

## Fail-closed behavior

If a module API/service/command does not exist or cannot be invoked, the runner reports FAIL with reproduction details. It does not create fallback business logic, fake IDs, SQLite fixtures, or hardcoded expected pass results.
