# INT-01A Failure Reporting Format

Every failure must be reported as a failed step in both JSON and Markdown. A failed result is blocking for Final Integration Gate v1.0.3.

## Required failure fields

```json
{
  "step": "INT01A-04",
  "title": "Approved module surface adapter/commands are bound",
  "error": {
    "name": "SmokeFailure",
    "message": "No approved module surface binding configured for INT-01A",
    "details": {
      "reproduction": "Create/bind an adapter ... then rerun npm run int01a:smoke.",
      "strictRule": "Runner will not implement business logic or fake module calls."
    }
  }
}
```

## Minimum reproduction detail

For any FAIL, include:

1. Step ID and title.
2. Exact invariant that failed.
3. Actual evidence observed by the runner.
4. Required configuration/API/table/column if missing.
5. Reproduction command:

```bash
set -a
source .env.integration.local
set +a
npm run int01a:smoke
```

## Blocking categories

| Category | Final Gate impact |
|---|---|
| Missing env or non-integration `NODE_ENV` | BLOCKED |
| Unreachable/non-PostgreSQL database | BLOCKED |
| Missing migrations/freeze-scope tables | BLOCKED |
| Missing MD-01 seed/preseed real IDs | BLOCKED |
| Missing approved API/service/command binding | BLOCKED |
| Missing VAT/AR/AP/inventory/GL rows | BLOCKED |
| Debit != Credit | BLOCKED |
| Missing `company_id` isolation where applicable | BLOCKED |
| Inventory ledger ↔ GL linkage not verifiable | BLOCKED |
| Cancel mutates posted financial rows instead of appending reversal | BLOCKED |

## Explicit non-remediation guidance

Do not remediate failures by adding fixture-only business logic to the runner, hardcoding expected results, using SQLite, changing accounting rules, changing schema outside approved scope, bypassing MD-01 seed, or opening P1/P2 scope.
