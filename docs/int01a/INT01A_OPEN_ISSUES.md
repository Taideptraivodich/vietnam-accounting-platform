# INT-01A Open Issues

## Status

Package status: **DELIVERED AS EXECUTABLE RUNNER**

Final Gate status after installing this package remains dependent on LOCAL-ASSEMBLY-01 runtime execution against the real candidate tree and PostgreSQL database.

## Known integration binding issue

The uploaded P0 dispatch package contains remediation documents only. It does not include the assembled candidate source tree or concrete module import paths. Therefore this package includes a fail-closed runner and an adapter contract, not hardcoded calls to unknown module internals.

LOCAL-ASSEMBLY-01 must bind the runner to existing approved module APIs/services/commands by either:

1. Implementing `src/int01a/int01a-approved-surface-adapter.mjs` as a thin adapter over existing approved surfaces; or
2. Exporting the documented `INT01A_*_COMMAND` variables for existing command wrappers.

If neither binding exists, `INT01A-04` fails with BLOCKED. This is intentional and prevents fake pass.

## Non-opened scope

The following remain explicitly closed:

```text
EW business logic revision: NOT OPENED
Architecture change: NOT OPENED
Accounting Engine rule change: NOT OPENED
Database schema redesign: NOT OPENED
P1/P2 scope: NOT OPENED
Production merge: NOT ALLOWED
```

## Expected blocker outputs if APIs are missing

If a module surface is missing, report:

```text
Status: BLOCKED
Blocking step: INT01A-04 or the relevant module post step
Reason: Approved API/service/command unavailable or returned no document identifiers
Required remediation: Bind an existing approved surface or expose an existing command wrapper; do not add business logic to the runner.
```
