# Local Candidate Source Tree v1.0.3

Scope: local assembly only. This tree was assembled from Senior-selected EW-01, EW-06, EW-02 v1.3, EW-05 v1.1, EW-03, EW-04, MD-01, and INT-01 artifacts. It is not a production merge and does not mark Final Gate PASS.

## Contents

- `src/`: compatibility source root for module tests and local runners.
- `backend/source/`: required backend source folder mirror of `src/`.
- `migrations/`: approved package migrations with dependency-safe DB execution order.
- `seeds/`: MD-01 seed data, seeder, and validation SQL.
- `tests/` and `test/`: module test artifacts copied without business-rule changes.
- `integration/INT-01/`: INT-01 harness/spec/report artifacts; no executable smoke runner is present.
- `raw_package_extract/`: direct output from Senior helper `prepare_local_candidate_worktree.sh`.

## Local ENV preparation

```bash
cp .env.integration.example .env.integration
# edit DATABASE_URL and MD01_* values for local disposable PostgreSQL only
set -a
. ./.env.integration
set +a
```

Use Docker PostgreSQL guidance from `docs/senior/LOCAL_DOCKER_POSTGRES_GUIDE_v1_0_3.md`. Do not use SQLite, fake URLs, or production database.

## Thin local commands

```bash
npm run migrate:order
npm run migrate:local
npm run seed:md01
npm run int01:procedure
```

`migrate:local` only calls `psql` over approved SQL files. `seed:md01` only calls the MD-01 seeder. `int01:procedure` only prints INT-01 procedure because the uploaded INT-01 package does not contain an executable cross-module runner.

## Hard stop

Do not mark Final Integration Gate PASS from this tree alone. A real DB-backed ENV+INT execution and Senior Final Merge Gate are still required.
