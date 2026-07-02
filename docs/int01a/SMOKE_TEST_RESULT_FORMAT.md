# INT-01A Smoke Test Result Format

The runner writes machine-readable JSON and human-readable Markdown.

## JSON path

```text
reports/int01a/int01a-smoke-result-<run-id>.json
```

## Top-level JSON schema

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-...",
  "status": "PASS | WARN | FAIL",
  "startedAt": "ISO-8601",
  "endedAt": "ISO-8601",
  "environment": {
    "nodeVersion": "vXX.YY.ZZ",
    "nodeEnv": "integration",
    "databaseUrlRedacted": "postgresql://user:***@host:port/db"
  },
  "steps": [
    {
      "id": "INT01A-05",
      "title": "Post Sales / Delivery baseline through approved surface",
      "status": "PASS | WARN | FAIL",
      "startedAt": "ISO-8601",
      "endedAt": "ISO-8601",
      "durationMs": 123,
      "evidence": {},
      "error": null
    }
  ],
  "openIssues": [],
  "runtime": {
    "db": {},
    "migrationInfo": {}
  }
}
```

## Mandatory step IDs

| Step | Meaning |
|---|---|
| `INT01A-00` | Required env and integration-only guard. |
| `INT01A-01` | Real PostgreSQL connectivity. |
| `INT01A-02` | Migrations/freeze-scope tables detected. |
| `INT01A-03` | MD-01 seed/preseed data exists. |
| `INT01A-04` | Approved module surface binding loaded. |
| `INT01A-05` | Sales/Delivery baseline posted and GL/AR checked. |
| `INT01A-06` | Purchase/GRNI baseline posted and GL/AP checked. |
| `INT01A-07` | VAT ledger baseline and linkage checked. |
| `INT01A-08` | AR/AP settlement posted and append-only checked. |
| `INT01A-09` | Inventory movement/adjustment posted and linkage checked. |
| `INT01A-10` | All smoke GL entries balanced. |
| `INT01A-11` | Company isolation checked. |
| `INT01A-12` | Cancel/reversal checked. |

## Exit codes

| Code | Meaning |
|---:|---|
| `0` | All mandatory invariants passed. |
| `1` | At least one smoke invariant failed. |
| `2` | Runner dependency/bootstrap failure such as missing `pg`. |
