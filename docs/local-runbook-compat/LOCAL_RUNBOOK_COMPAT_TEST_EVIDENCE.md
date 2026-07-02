# Local Runbook Compatibility Test Evidence P0 v1.0.3

## Static checks performed in package build sandbox

```text
bash -n scripts/apply_ordered_migrations_crlf_safe.sh: PASS
bash -n scripts/psql_local.sh: PASS
bash -n scripts/final_gate_local_env_exports.sh: PASS
Patch snippet file generated: PASS
```

## Database execution evidence

```text
Not executed against the user's local Docker PostgreSQL inside this artifact build sandbox.
LOCAL-ASSEMBLY-01 must run the psql, CRLF migration, and INT01A alias validation commands after extraction.
```

## Expected local evidence after rerun

```text
psql -d "$DATABASE_URL": PASS
CRLF MIGRATION_ORDER.txt does not skip migrations: PASS
INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries: PASS
INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries: PASS
Final Gate reaches INT01A-04 or beyond depending on INT-01B adapter application: PASS
```
