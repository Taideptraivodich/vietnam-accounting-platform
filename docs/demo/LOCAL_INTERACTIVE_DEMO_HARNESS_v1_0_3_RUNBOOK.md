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

## v1.0.3a Trace/UI Readiness Clarification

Session #1 is classified as:

```text
PASS WITH ISSUES / CONTROLLED SMOKE ONLY
Full accounting business validation: NOT COMPLETED
End-user UAT: NOT OPENED
Production: NOT ALLOWED
```

v1.0.3a keeps the same approved write boundary and adds UI/evidence clarity only:

- Separates scenario action/accounting status from trace visibility warnings.
- Keeps `WARN` as review/readiness feedback, not as automatic accounting failure.
- Captures Sales-sensitive stock balance before/after using read-only trace queries.
- Adds reviewer checklist for source document, GL balance, company isolation, AR/AP, VAT, inventory, and reversal evidence.
- Disables scenario buttons while a scenario is running to reduce duplicate-click/race behavior.
- Adds guidance that repeated Sales-based runs consume demo stock and may correctly trigger negative-stock protection.

This patch does not change:

- Accounting core behavior.
- Negative stock blocking.
- Approved adapter behavior.
- Migrations.
- Production deployment behavior.


## v1.0.3b trace mapping readiness notes

`v1.0.3b` keeps the harness local-only and keeps accounting core behavior unchanged.

Additional reviewer-facing evidence:

```text
Trace mapping evidence
- Concrete trace rows when the read model exposes them
- Explicit INFO/N/A mapping rows when the local read model does not expose a direct subledger/reversal marker
- Separate Action PASS, Accounting PASS, and Trace visibility status
```

Targeted improvements:

```text
Sales:
- AR mapping now shows customer AR rows when available or an explicit source-invoice/GL mapping reason.
- VAT mapping uses tax ledger rows when available or source invoice VAT amount as explicit reviewer evidence.
- Inventory mapping uses inventory ledger rows when available or delivery/stock evidence as explicit reviewer evidence.

Inventory:
- Source/action, GL, inventory movement, and stock-balance sections now show concrete rows or explicit N/A/read-model reasons.

Cancel/Reversal:
- Original source document, cancelDocument result, reversal marker, and append-only evidence are separated for reviewer reading.
- Missing reversal markers are shown as INFO/read-model mapping notes rather than being confused with accounting failure.
```

Guardrail unchanged:

```text
Production: NOT ALLOWED
UAT: NOT OPENED
Main merge: NOT ALLOWED
Accounting core: NOT CHANGED
Negative stock rule: NOT CHANGED
```

