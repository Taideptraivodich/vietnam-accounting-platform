# Validation Commands — Local Runbook Compatibility v1.0.3

## Static checks

```bash
bash -n scripts/apply_ordered_migrations_crlf_safe.sh
bash -n scripts/psql_local.sh
bash -n scripts/final_gate_local_env_exports.sh
```

## psql compatibility check

```bash
psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'select 1 as psql_dash_d_ok;'
```

## CRLF migration order check

```bash
printf 'migrations/001_example.sql\r\n' > /tmp/MIGRATION_ORDER_CRLF.txt
mkdir -p /tmp/vap-crlf-test/migrations
printf 'select 1;\n' > /tmp/vap-crlf-test/migrations/001_example.sql
DATABASE_URL="$DATABASE_URL" \
MIGRATION_ORDER_FILE=/tmp/MIGRATION_ORDER_CRLF.txt \
MIGRATION_ROOT=/tmp/vap-crlf-test \
bash -x scripts/apply_ordered_migrations_crlf_safe.sh
```

## AR/AP alias check

```bash
unset INT01A_TABLE_AR_LEDGER INT01A_TABLE_AP_LEDGER
source scripts/final_gate_local_env_exports.sh
test "$INT01A_TABLE_AR_LEDGER" = "ar_ap_ledger_entries"
test "$INT01A_TABLE_AP_LEDGER" = "ar_ap_ledger_entries"
echo "ar_ap_alias_result=PASS"
```
