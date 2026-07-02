# Dispatch — LOCAL-ASSEMBLY-01 Rerun After INT-01B / Preseed / Runbook Pass

## Senior instruction

Rerun Final Integration Gate v1.0.3 locally using Docker PostgreSQL and the accepted input packages.

## Apply inputs

Apply these packages to the candidate tree:

```text
LOCAL_ASSEMBLY_RERUN_INPUTS_v1_0_3_READY.zip
INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0.zip
MD01_EW01_PRESEED_ACCOUNT_SUBTYPE_PATCH_P0_v1_1.zip
LOCAL_RUNBOOK_COMPAT_PATCH_P0_v1_0_3.zip
```

## Required environment

```bash
export NODE_ENV=integration
export DATABASE_URL="postgres://vap_user:***@127.0.0.1:15432/vap_integration"
export INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
export INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
export INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs
```

After MD01/EW01 preseed v1.1, export real DB IDs:

```bash
export MD01_COMPANY_ID=<real UUID>
export MD01_INVENTORY_ACCOUNT_ID=<real UUID>
export MD01_COGS_ACCOUNT_ID=<real UUID>
export MD01_REVENUE_ACCOUNT_ID=<real UUID>
export MD01_EXPENSE_ACCOUNT_ID=<real UUID>
export MD01_GRNI_ACCOUNT_ID=<real UUID>
```

## Rerun sequence

```text
1. Start clean Docker PostgreSQL 16 database.
2. Apply ordered migrations using CRLF-safe migration loop.
3. Run MD01/EW01 deterministic preseed v1.1.
4. Verify generated account IDs and account_subtype values.
5. Run MD-01 seed.
6. Apply INT-01B adapter binding package.
7. Run INT01B adapter load check.
8. Run npm run int01a:smoke.
9. Capture full Final Integration Gate report.
```

## Expected output

Return:

```text
LOCAL_ASSEMBLY_FINAL_GATE_v1_0_3_RERUN_REPORTS.zip
```

## Stop rules

```text
Do not fake adapter output.
Do not use SQL inserts to simulate module behavior.
Do not skip MD-01 seed.
Do not ignore migration failures.
Do not merge production.
```
