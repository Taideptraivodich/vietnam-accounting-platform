# Final Integration Rerun v1.0.3 — Direct Upload Bundle

This bundle replaces the v1.0.2 rerun inputs for the next Integration Worker run.

## Senior Status

```text
EW-02 TS2322 blocker: RESOLVED by v1.3
EW-05 v1.1: PASS FOR INTEGRATION
MD-01: PASS, requires DATABASE_URL at runtime
Final Integration Gate: READY TO RERUN
Production merge: NOT ALLOWED until gate passes
```

## Mandatory Runtime Requirement

Before running the database-backed smoke test:

```bash
export DATABASE_URL=postgres://...
```

Use a disposable PostgreSQL database. Do not bypass MD-01 seed.

## Stop Conditions

Stop and report BLOCKED if:

```text
- DATABASE_URL is missing.
- Any migration fails.
- MD-01 seed fails.
- Any module verify/test fails.
- Cross-module smoke test fails.
```

No production merge without full pass.
