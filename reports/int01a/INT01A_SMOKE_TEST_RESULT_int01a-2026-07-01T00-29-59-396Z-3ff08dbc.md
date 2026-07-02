# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T00-29-59-396Z-3ff08dbc
- Status: **FAIL**
- Started: 2026-07-01T00:29:59.397Z
- Ended: 2026-07-01T00:29:59.692Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 0 | Required environment is present and integration-only |
| INT01A-01 | PASS | 55 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 37 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 34 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 3 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 115 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: [INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed

```json
{
  "errors": [
    {
      "method": "postSalesInvoice",
      "message": "Negative stock is blocked by default"
    }
  ]
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T00-29-59-396Z-3ff08dbc",
  "status": "FAIL",
  "startedAt": "2026-07-01T00:29:59.397Z",
  "endedAt": "2026-07-01T00:29:59.692Z",
  "environment": {
    "nodeVersion": "v24.11.1",
    "nodeEnv": "integration",
    "databaseUrlRedacted": "postgres://postgres:***@127.0.0.1:15432/local_final_gate"
  },
  "steps": [
    {
      "id": "INT01A-00",
      "title": "Required environment is present and integration-only",
      "status": "PASS",
      "startedAt": "2026-07-01T00:29:59.397Z",
      "endedAt": "2026-07-01T00:29:59.397Z",
      "durationMs": 0,
      "evidence": {
        "requiredEnv": [
          "DATABASE_URL",
          "NODE_ENV",
          "MD01_COMPANY_ID",
          "MD01_INVENTORY_ACCOUNT_ID",
          "MD01_COGS_ACCOUNT_ID",
          "MD01_REVENUE_ACCOUNT_ID",
          "MD01_EXPENSE_ACCOUNT_ID"
        ],
        "databaseUrlRedacted": "postgres://postgres:***@127.0.0.1:15432/local_final_gate"
      },
      "error": null
    },
    {
      "id": "INT01A-01",
      "title": "Database connectivity uses real PostgreSQL",
      "status": "PASS",
      "startedAt": "2026-07-01T00:29:59.397Z",
      "endedAt": "2026-07-01T00:29:59.452Z",
      "durationMs": 55,
      "evidence": {
        "postgresVersion": "PostgreSQL 16.14 (Debian 16.14-1.pgdg13+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit",
        "database": "local_final_gate",
        "schema": "public"
      },
      "error": null
    },
    {
      "id": "INT01A-02",
      "title": "Migrations already applied / freeze-scope tables exist",
      "status": "PASS",
      "startedAt": "2026-07-01T00:29:59.452Z",
      "endedAt": "2026-07-01T00:29:59.489Z",
      "durationMs": 37,
      "evidence": {
        "migrationInfo": {
          "migrationTable": null,
          "rows": null,
          "warning": "No common migration metadata table detected; required freeze-scope tables are used as migration-applied evidence."
        },
        "resolvedTables": {
          "companies": "public.companies",
          "accounts": "public.accounts",
          "customers": "public.customers",
          "suppliers": "public.suppliers",
          "items": "public.items",
          "warehouses": "public.warehouses",
          "accountingDocuments": "public.journal_entries",
          "glEntries": "public.gl_entries",
          "vatLedger": "public.tax_ledger_entries",
          "arLedger": "public.ar_ap_ledger_entries",
          "apLedger": "public.ar_ap_ledger_entries",
          "inventoryLedger": "public.inventory_ledger_entries",
          "stockBalances": "public.stock_balances",
          "salesInvoices": "public.sales_invoices",
          "purchaseReceipts": "public.purchase_receipts",
          "purchaseInvoices": "public.purchase_invoices",
          "migrations": null,
          "arapAllocations": "public.ar_ap_allocations",
          "deliveries": "public.delivery_notes"
        }
      },
      "error": null
    },
    {
      "id": "INT01A-03",
      "title": "MD-01 seed/preseed real master data exists",
      "status": "PASS",
      "startedAt": "2026-07-01T00:29:59.489Z",
      "endedAt": "2026-07-01T00:29:59.523Z",
      "durationMs": 34,
      "evidence": {
        "companyId": "c9422414-c21a-429e-a2ab-b7de81512425",
        "companyExists": true,
        "masterData": {
          "customers": {
            "count": 1,
            "scoped": true,
            "companyCol": "company_id"
          },
          "suppliers": {
            "count": 1,
            "scoped": true,
            "companyCol": "company_id"
          },
          "items": {
            "count": 1,
            "scoped": true,
            "companyCol": "company_id"
          },
          "warehouses": {
            "count": 1,
            "scoped": true,
            "companyCol": "company_id"
          }
        },
        "accountChecks": {
          "inventory": {
            "id": "e34fa78e-3a4c-4cfc-9d8c-6d7398e60fdc",
            "exists": true
          },
          "cogs": {
            "id": "c868831d-cceb-4e52-b270-057cd6d99234",
            "exists": true
          },
          "revenue": {
            "id": "303a2e56-3e46-4333-a857-97fff6ad2801",
            "exists": true
          },
          "expense": {
            "id": "2a250e28-d3dc-43f5-a682-f2f3e8ce4cc9",
            "exists": true
          },
          "grni": {
            "id": "0bb01cb0-de31-4597-a0a5-09d4a701c1c7",
            "exists": true
          }
        },
        "grniSubtype": {
          "subtypeColumn": "account_subtype",
          "goodsReceivedNotInvoicedRows": 1
        }
      },
      "error": null
    },
    {
      "id": "INT01A-04",
      "title": "Approved module surface adapter/commands are bound",
      "status": "PASS",
      "startedAt": "2026-07-01T00:29:59.523Z",
      "endedAt": "2026-07-01T00:29:59.526Z",
      "durationMs": 3,
      "evidence": {
        "mode": "module",
        "adapterPath": "./src/int01a/int01a-approved-surface-adapter.mjs",
        "commandMode": false
      },
      "error": null
    },
    {
      "id": "INT01A-05",
      "title": "Post Sales / Delivery baseline through approved surface",
      "status": "FAIL",
      "startedAt": "2026-07-01T00:29:59.577Z",
      "endedAt": "2026-07-01T00:29:59.692Z",
      "durationMs": 115,
      "evidence": null,
      "error": {
        "name": "Int01bWiringError",
        "message": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed",
        "details": {
          "errors": [
            {
              "method": "postSalesInvoice",
              "message": "Negative stock is blocked by default"
            }
          ]
        }
      }
    }
  ],
  "openIssues": [
    {
      "step": "INT01A-05",
      "title": "Post Sales / Delivery baseline through approved surface",
      "error": {
        "name": "Int01bWiringError",
        "message": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed",
        "details": {
          "errors": [
            {
              "method": "postSalesInvoice",
              "message": "Negative stock is blocked by default"
            }
          ]
        }
      }
    }
  ],
  "runtime": {
    "db": {
      "postgresVersion": "PostgreSQL 16.14 (Debian 16.14-1.pgdg13+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit",
      "database": "local_final_gate",
      "schema": "public"
    },
    "migrationInfo": {
      "migrationTable": null,
      "rows": null,
      "warning": "No common migration metadata table detected; required freeze-scope tables are used as migration-applied evidence."
    }
  },
  "terminalError": {
    "name": "Int01bWiringError",
    "message": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed",
    "details": {
      "errors": [
        {
          "method": "postSalesInvoice",
          "message": "Negative stock is blocked by default"
        }
      ]
    }
  }
}
```
