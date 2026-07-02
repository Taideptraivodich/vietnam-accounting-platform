# Expected Output Checklist

On Windows Git Bash with Docker Desktop, the clean rerun should show the following sequence.

```text
[ ] Required commands found: docker, psql, node, npm
[ ] Docker daemon reachable
[ ] Python 3 detected via python, python3, or py -3
[ ] PostgreSQL 16 container starts on 127.0.0.1:15432
[ ] Readiness waits using: psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc 'select 1'
[ ] MIGRATION_ROOT resolves to migrations
[ ] SQL-only migration order is generated from MIGRATION_ORDER.txt or migrations/00[1-7]*.sql
[ ] CRLF line endings in migration order do not break path resolution
[ ] Migrations 001-007 apply successfully
[ ] Non-SQL seed/script step is written to migration_skipped_non_sql_steps.txt, not treated as a missing SQL migration
[ ] MD01/EW01 preseed runs with detected Python
[ ] MD01_* values emitted by preseed are captured when present
[ ] npm ci or npm install runs before Node seed/smoke steps
[ ] Node module pg is resolvable before seed/smoke steps
[ ] npm run seed:md01 runs as the separate seed/script step
[ ] npm run int01a:smoke runs through the real adapter path
[ ] INT01A JSON/Markdown reports are copied into evidence
[ ] If INT01A-05 still fails, the real failure is preserved and the runner exits non-zero
```

A real continuing blocker should remain visible as a smoke-test failure, for example:

```text
[INT01A] No approved module surface resolved for postSalesDelivery.
```

The runner must not turn that blocker into a pass.
