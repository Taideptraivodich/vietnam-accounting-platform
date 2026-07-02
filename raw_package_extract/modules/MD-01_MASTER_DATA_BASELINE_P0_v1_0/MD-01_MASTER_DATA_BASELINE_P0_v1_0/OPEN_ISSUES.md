# OPEN_ISSUES.md — MD-01 Master Data Baseline P0 v1.0

## OI-MD01-001 — Company creation is upstream dependency

Severity: P0 dependency, not owned by MD-01.

MD-01 does not create `companies`; the required smoke step “Create company” must be satisfied by the approved company/admin baseline before this package is applied.

## OI-MD01-002 — Account IDs must be supplied by EW-01 / account resolver

Severity: P0 dependency, not owned by MD-01.

The stock item requires `inventory_account_id`, `cogs_account_id`, `revenue_account_id`, and `expense_account_id`. The seeder deliberately does not resolve or hard-code account codes. It requires explicit `accounts.id` values from the approved account baseline/resolver.

## OI-MD01-003 — Actual DB column types must match UUID assumptions

Severity: integration check.

The migration assumes `companies.id` and `accounts.id` are UUID. If upstream packages use another physical type, this migration needs a mechanical type alignment before merge.

## OI-MD01-004 — Runtime validation not executed in this workspace

Severity: environment limitation.

A validation SQL script is included, but no runnable integrated repository/PostgreSQL runtime was supplied in the current workspace. Validation should be run during final smoke assembly.

## OI-MD01-005 — No optional `parties` abstraction added

Severity: none / intentional.

The dispatch allows optional `parties`, but this package omits it to avoid breaking EW-02/EW-03/EW-04 contracts and to keep P0 scope minimal.
