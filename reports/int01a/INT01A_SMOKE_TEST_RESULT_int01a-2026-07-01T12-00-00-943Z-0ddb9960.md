# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T12-00-00-943Z-0ddb9960
- Status: **FAIL**
- Started: 2026-07-01T12:00:00.945Z
- Ended: 2026-07-01T12:00:01.316Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 1 | Required environment is present and integration-only |
| INT01A-01 | PASS | 47 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 41 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 39 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 6 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 175 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: [INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed

```json
{
  "errors": [
    {
      "method": "postSalesInvoice",
      "message": "Cannot read properties of undefined (reading 'findByIdempotencyKey')"
    }
  ]
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T12-00-00-943Z-0ddb9960",
  "status": "FAIL",
  "startedAt": "2026-07-01T12:00:00.945Z",
  "endedAt": "2026-07-01T12:00:01.316Z",
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
      "startedAt": "2026-07-01T12:00:00.945Z",
      "endedAt": "2026-07-01T12:00:00.946Z",
      "durationMs": 1,
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
      "startedAt": "2026-07-01T12:00:00.946Z",
      "endedAt": "2026-07-01T12:00:00.993Z",
      "durationMs": 47,
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
      "startedAt": "2026-07-01T12:00:00.993Z",
      "endedAt": "2026-07-01T12:00:01.034Z",
      "durationMs": 41,
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
      "startedAt": "2026-07-01T12:00:01.035Z",
      "endedAt": "2026-07-01T12:00:01.074Z",
      "durationMs": 39,
      "evidence": {
        "companyId": "00744402-bd83-4ab2-8388-a2f11a209e11",
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
            "id": "aab39d9c-429f-412c-9827-bf931e4f5e7d",
            "exists": true
          },
          "cogs": {
            "id": "45ae8a50-e84a-4f7a-825d-e15a0674b3ea",
            "exists": true
          },
          "revenue": {
            "id": "09f987da-4698-4c9f-8e4c-52ef9fbba3ef",
            "exists": true
          },
          "expense": {
            "id": "72aee1c2-e9c6-45f3-bfc1-ce2718301fc5",
            "exists": true
          },
          "grni": {
            "id": "fa2f9613-c430-4072-989d-b01da2133a24",
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
      "startedAt": "2026-07-01T12:00:01.074Z",
      "endedAt": "2026-07-01T12:00:01.080Z",
      "durationMs": 6,
      "evidence": {
        "mode": "module",
        "adapterPath": "./src/int01a/int01a-approved-surface-adapter-int01c.mjs",
        "commandMode": false
      },
      "error": null
    },
    {
      "id": "INT01A-05",
      "title": "Post Sales / Delivery baseline through approved surface",
      "status": "FAIL",
      "startedAt": "2026-07-01T12:00:01.141Z",
      "endedAt": "2026-07-01T12:00:01.316Z",
      "durationMs": 175,
      "evidence": null,
      "error": {
        "name": "Int01bWiringError",
        "message": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed",
        "details": {
          "errors": [
            {
              "method": "postSalesInvoice",
              "message": "Cannot read properties of undefined (reading 'findByIdempotencyKey')"
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
              "message": "Cannot read properties of undefined (reading 'findByIdempotencyKey')"
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
          "message": "Cannot read properties of undefined (reading 'findByIdempotencyKey')"
        }
      ]
    }
  }
}
```
