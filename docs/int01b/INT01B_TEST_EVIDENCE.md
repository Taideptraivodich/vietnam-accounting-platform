# INT01B Test Evidence

## Static checks performed while building this package

```text
node --check src/int01a/int01a-approved-surface-adapter.mjs: PASS
node scripts/int01b-verify-adapter-load.mjs: PASS
No skeleton throw text `INT-01A adapter not bound`: PASS
No direct SQL execution calls in adapter: PASS
```

## Required local assembly evidence after applying to candidate tree

Run from repository root:

```bash
set -a
source .env.integration.local
set +a

export NODE_ENV=integration
export INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
export INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
export INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs

node --check src/int01a/int01a-approved-surface-adapter.mjs
node scripts/int01b/int01b-verify-adapter-load.mjs
npm run int01a:smoke
```

Expected evidence to capture:

```text
INT01A-04 Approved module surface adapter/commands are bound: PASS / progressed beyond blocker
Any later failure: real approved module surface/invariant failure, not missing binding
```

## Important limitation

The uploaded dispatch package did not include the full candidate source tree, so DB-backed `npm run int01a:smoke` could not be executed inside this packaging environment. This package therefore includes a load/binding verification script and a required smoke evidence plan for LOCAL-ASSEMBLY-01.
