# Local Interactive Demo Harness v1.0.3 Runbook

Status guardrails:

```text
LOCAL INTERNAL DEMO ONLY — NOT UAT — NOT PRODUCTION
Production merge: NOT ALLOWED
Production release: NOT ALLOWED
End-user UAT: NOT OPENED
P1/P2: NOT OPENED
```

## Added local-only commands

```bash
npm run demo:local
npm run demo:guardrail
npm run demo:smoke
npm run demo:smoke:actions -- --company-id="$MD01_COMPANY_ID"
```

There is intentionally no dependency on `npm run dev`.

## Local gate

The harness refuses to render the UI or execute action endpoints unless all of the following are true:

```bash
export DEMO_INTERACTIVE_ENABLED=true
export NODE_ENV=development   # or integration; never production
export DATABASE_URL='postgres://postgres:postgres@127.0.0.1:15432/local_final_gate'
```

`DATABASE_URL` must use PostgreSQL and a local host: `localhost`, `127.0.0.1`, or `::1`. Database/host names with production/UAT/live/customer markers are refused.

## Approved write boundary

The harness action runner calls the existing approved INT01A/INT01D adapter surface by default:

```text
src/int01a/int01a-approved-surface-adapter-int01c.mjs
```

Override only for local review with:

```bash
export LIDH_APPROVED_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter-int01c.mjs
```

Trace readers use read-only `SELECT` queries only. The new harness files do not run direct SQL business mutations against protected tables.

## UI and endpoints

Open the local UI:

```text
http://127.0.0.1:3000/demo/internal
```

Scenario action endpoints:

```text
POST /api/v1/companies/:companyId/demo/scenarios/sales-ar-vat-inventory-gl/run
POST /api/v1/companies/:companyId/demo/scenarios/purchase-grni/run
POST /api/v1/companies/:companyId/demo/scenarios/inventory-movement-consistency/run
POST /api/v1/companies/:companyId/demo/scenarios/ar-ap-settlement-visibility/run
POST /api/v1/companies/:companyId/demo/scenarios/cancel-reversal-verification/run
GET  /api/v1/companies/:companyId/demo/scenarios/:runId/trace
```

Each response contains:

```json
{
  "status": "PASS | FAIL",
  "scenario": "...",
  "runId": "...",
  "companyId": "...",
  "sourceDocuments": [],
  "trace": {
    "gl": [],
    "journalEntries": [],
    "ar": [],
    "ap": [],
    "arap": [],
    "allocations": [],
    "tax": [],
    "inventory": [],
    "stockBalances": []
  },
  "invariants": [],
  "warnings": []
}
```

## Suggested local verification sequence

After applying migrations 001–007, MD01 preseed/seed, and exporting the same local Final Gate env used for INT01A:

```bash
npm run demo:guardrail
DEMO_INTERACTIVE_ENABLED=true NODE_ENV=development npm run demo:smoke
DEMO_INTERACTIVE_ENABLED=true NODE_ENV=development npm run demo:smoke:actions -- --company-id="$MD01_COMPANY_ID"
DEMO_INTERACTIVE_ENABLED=true NODE_ENV=development npm run demo:local
```

Then rerun the project Final Integration Gate v1.0.3 and INT01A/INT01D checks using the existing repo protocol.
