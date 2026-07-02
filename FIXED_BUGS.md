# Fixed Bugs in LOCAL_RUNBOOK v1.0.5

## 1. Python override handling

The v1.0.4 runbook treated `PYTHON_BIN="py -3"` as a single executable name, which fails in Windows Git Bash. v1.0.5 parses command-plus-argument values into a Bash argv array and verifies that the selected command is Python 3 before invoking the preseed script.

Supported launch forms:

```text
python
python3
py -3
PYTHON_BIN="py -3"
```

A clear error is emitted only after all supported Python 3 launch forms fail.

## 2. Preseed autodetect

v1.0.5 auto-detects the accepted script at:

```text
scripts/setup_md01_local_preseed.py
```

`PRESEED_SCRIPT` remains supported as an override, but the runbook now validates that the override is a real file and rejects accidental error strings such as `Could not auto-detect ...` instead of treating them as script paths.

## 3. Preseed invocation and capture

The preseed is run exactly with:

```bash
--output-dir "$EVIDENCE_DIR/md01-preseed-v1.2" --print-generated-sql
```

The runbook captures preseed console output, the generated env file, and readiness/report artifacts into the evidence directory.

## 4. Environment propagation

Before both `npm run seed:md01` and `npm run int01a:smoke`, v1.0.5 exports:

```text
DATABASE_URL
NODE_ENV=integration
MD01_COMPANY_ID
MD01_INVENTORY_ACCOUNT_ID
MD01_COGS_ACCOUNT_ID
MD01_REVENUE_ACCOUNT_ID
MD01_EXPENSE_ACCOUNT_ID
MD01_GRNI_ACCOUNT_ID
INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs
```

The env is sourced and exported in the same shell that invokes the npm commands, removing the need for manual `.env.integration.generated` sourcing or manual smoke rerun.

## 5. DATABASE_URL consistency

The script derives one default DATABASE_URL from the Docker PostgreSQL credentials and uses it for every local gate phase:

```text
postgres://postgres:postgres@127.0.0.1:15432/local_final_gate
```

This same value is used for psql readiness, migrations, preseed, MD01 seed, and INT01A smoke. A stale pre-existing shell `DATABASE_URL` is ignored unless the Docker credential variables themselves are changed, preventing the observed mismatch from recurring.

## 6. Real gate failures remain visible

INT01A failures are not hidden. If `npm run int01a:smoke` exits non-zero, the runbook preserves JSON/Markdown/console evidence, records the first failing INT01A step, writes a local gate summary, creates the evidence zip when possible, and exits non-zero.

## 7. Evidence zip recursion avoidance

Evidence zips are created as a sibling of the evidence run directory, not inside the directory being zipped. This avoids recursive or nested evidence capture errors.
