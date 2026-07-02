# Before / After — Local Runbook Compatibility v1.0.3

## Before

```text
psql "$DATABASE_URL" was used in local commands and was unreliable in Windows/Git Bash.
MIGRATION_ORDER.txt lines containing CRLF retained a trailing \r, causing file existence checks to fail or migration logs to look blank.
AR/AP ledger discovery required manual exports because ar_ap_ledger_entries was not a default alias.
```

## After

```text
All included helper scripts invoke PostgreSQL as psql -d "$DATABASE_URL".
The migration loop strips trailing \r and whitespace before checking paths.
The migration loop fails loudly if a normalized migration path does not exist.
AR/AP ledger defaults are exported as ar_ap_ledger_entries for both AR and AP.
Manual overrides remain allowed by exporting INT01A_TABLE_AR_LEDGER or INT01A_TABLE_AP_LEDGER before sourcing final_gate_local_env_exports.sh.
```
