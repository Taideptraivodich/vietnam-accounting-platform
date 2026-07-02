# Local Runbook Compatibility Notes for Final Gate v1.0.3

These notes are included because the Senior dispatch accepted local runbook compatibility as P0 cleanup.

## PostgreSQL command form

Use:

```bash
psql -d "$DATABASE_URL"
```

Do not rely on:

```bash
psql -d "$DATABASE_URL"
```

## CRLF-safe migration order loop

Use either a cleaned file:

```bash
tr -d '\r' < migrations/MIGRATION_ORDER.txt > migrations/MIGRATION_ORDER.clean.txt
while IFS= read -r migration; do
  [ -z "$migration" ] && continue
  psql -d "$DATABASE_URL" -f "migrations/$migration"
done < migrations/MIGRATION_ORDER.clean.txt
```

Or strip carriage returns inside the loop:

```bash
while IFS= read -r migration; do
  migration="${migration%$'\r'}"
  [ -z "$migration" ] && continue
  psql -d "$DATABASE_URL" -f "migrations/$migration"
done < migrations/MIGRATION_ORDER.txt
```

## AR/AP ledger aliases

Use explicit env overrides for the v1.0.3 rerun:

```bash
export INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
export INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
```

This package documents the alias requirement. It does not alter the INT01A runner because the candidate runner source was not included in the dispatch zip.


# LOCAL_RUNBOOK v1.0.6: JSON report is source of truth for INT01A first failure.
INT01A_REPORTS_DIR="${INT01A_REPORTS_DIR:-reports/int01a}"
INT01A_CONSOLE_LOG="${INT01A_CONSOLE_LOG:-${EVIDENCE_DIR:-reports}/int01a_console.log}"
node scripts/int01a-json-first-failure-summary.mjs \
  --reports-dir "$INT01A_REPORTS_DIR" \
  --console-log "$INT01A_CONSOLE_LOG" || true
