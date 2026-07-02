# EW-02 Test Evidence v1.3 — AR/AP Route TS2322 Hotfix

## Environment

- Package: `ew-02-ar-ap-route-ts2322-hotfix`
- Version: `1.3.0`
- Date: 2026-06-27
- Scope: EW-02 route-boundary TypeScript TS2322 hotfix only

## Commands Run

### 1. `npm install --ignore-scripts`

Result: PASS

```text
up to date, audited 349 packages in 2s

58 packages are looking for funding
  run `npm fund` for details

19 moderate severity vulnerabilities

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

The install command completed successfully. The audit warnings are inherited dependency audit output and did not block install, TypeScript verification or Jest tests.

### 2. `npm run test:types`

Result: PASS

```text
> ew-02-ar-ap-route-ts2322-hotfix@1.3.0 test:types
> tsc --noEmit
```

### 3. `npm run verify`

Result: PASS

```text
> ew-02-ar-ap-route-ts2322-hotfix@1.3.0 verify
> npm run test:types && npm test


> ew-02-ar-ap-route-ts2322-hotfix@1.3.0 test:types
> tsc --noEmit


> ew-02-ar-ap-route-ts2322-hotfix@1.3.0 test
> jest --runInBand

PASS tests/ar-ap.service.test.ts
PASS tests/ar-ap.routes.test.ts

Test Suites: 2 passed, 2 total
Tests:       32 passed, 32 total
Snapshots:   0 total
Time:        3.247 s
Ran all test suites.
```

### 4. `npm test`

Result: PASS

```text
> ew-02-ar-ap-route-ts2322-hotfix@1.3.0 test
> jest --runInBand

PASS tests/ar-ap.service.test.ts
PASS tests/ar-ap.routes.test.ts

Test Suites: 2 passed, 2 total
Tests:       32 passed, 32 total
Snapshots:   0 total
Time:        2.153 s, estimated 3 s
Ran all test suites.
```

## Acceptance Criteria

- `npm run verify`: PASS
- `tsc --noEmit`: PASS
- Jest tests: PASS
- No schema/API/accounting semantics changed: PASS

## Files Changed

- `src/routes/ar-ap.routes.ts`
  - Added `requiredSingle` and `optionalSingle` route-boundary helpers.
  - Normalized params, headers and query fields before DTO construction.
- `tests/ar-ap.routes.test.ts`
  - Added helper unit tests for route-boundary normalization.
- `package.json`
  - Updated package metadata to v1.3.0.
- `docs/TS2322_ROUTE_BOUNDARY_HOTFIX.md`
  - Added implementation summary and guardrail confirmation.
- `docs/TEST_EVIDENCE_EW02_v1_3.md`
  - Added command evidence and acceptance status.

## Explicit Non-Changes

- No changes to `migrations/001_ar_ap_ledger_and_allocations.sql`.
- No changes to AR/AP allocation append-only event model.
- No changes to transaction boundary behaviour from v1.2.
- No changes to EW-01 posting/reversal contract.
- No changes to journal/GL logic.
