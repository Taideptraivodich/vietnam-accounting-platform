# LOCAL_ASSEMBLY_INPUT_PACKAGE v1.0.3

This package is prepared for **LOCAL-ASSEMBLY-01** to assemble a local runnable candidate source tree and run Final Integration Gate v1.0.3 on a local machine with Docker PostgreSQL.

## Contents

- `packages/`: canonical Senior-selected source output zip files.
- `expanded/`: the same packages extracted for quick inspection/copy.
- `docs/`: selected Senior review and rerun handoff docs.
- `scripts/`: local helper scripts/templates. These do not merge production.
- `LOCAL_ASSEMBLY_MANIFEST_EXPECTED.md`: source/migration/seed/test matrix and apply order.
- `CHECKSUMS.sha256`: package integrity hashes.

## Recommended local flow

1. Create a new local working directory, outside production branches.
2. Extract this package.
3. Use `expanded/` or unzip files from `packages/` into a candidate source tree.
4. Start disposable PostgreSQL locally, for example with Docker.
5. Export `DATABASE_URL` for the same shell/runtime that runs migrations, MD-01 seed, and INT-01 smoke.
6. Apply migrations in the order from `LOCAL_ASSEMBLY_MANIFEST_EXPECTED.md`.
7. Run MD-01 seed. Do not bypass seed.
8. Run module checks and INT-01 smoke flow.
9. Return Final Integration Gate reports for Senior Final Merge Gate.

## Hard stop rules

- Do not fake `DATABASE_URL`.
- Do not use SQLite.
- Do not use production database.
- Do not skip MD-01 seed.
- Do not merge production.
- Do not open P1/P2 scope.
