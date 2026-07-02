# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T00-33-41-231Z-cce23f1f
- Status: **FAIL**
- Started: 2026-07-01T00:33:41.232Z
- Ended: 2026-07-01T00:33:41.512Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 0 | Required environment is present and integration-only |
| INT01A-01 | PASS | 46 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 35 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 34 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 3 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 110 | Post Sales / Delivery baseline through approved surface |

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
  "runId": "int01a-2026-07-01T00-33-41-231Z-cce23f1f",
  "status": "FAIL",
  "startedAt": "2026-07-01T00:33:41.232Z",
  "endedAt": "2026-07-01T00:33:41.512Z",
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
      "startedAt": "2026-07-01T00:33:41.232Z",
      "endedAt": "2026-07-01T00:33:41.232Z",
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
      "startedAt": "2026-07-01T00:33:41.232Z",
      "endedAt": "2026-07-01T00:33:41.278Z",
      "durationMs": 46,
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
      "startedAt": "2026-07-01T00:33:41.278Z",
      "endedAt": "2026-07-01T00:33:41.313Z",
      "durationMs": 35,
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
      "startedAt": "2026-07-01T00:33:41.313Z",
      "endedAt": "2026-07-01T00:33:41.347Z",
      "durationMs": 34,
      "evidence": {
        "companyId": "fe4a20ce-487f-4100-8905-96e0b103b6f1",
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
            "id": "b1a95c54-d1c2-45aa-b487-d3e47a722bc5",
            "exists": true
          },
          "cogs": {
            "id": "a80a1357-6f54-49d5-80b2-d4c03780e030",
            "exists": true
          },
          "revenue": {
            "id": "03196e38-e4c8-46ce-830c-9b82d16def5f",
            "exists": true
          },
          "expense": {
            "id": "fdf89fff-8609-476e-9afc-833619c4ebd0",
            "exists": true
          },
          "grni": {
            "id": "82da2746-676f-41fd-b312-56034e60284c",
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
      "startedAt": "2026-07-01T00:33:41.347Z",
      "endedAt": "2026-07-01T00:33:41.350Z",
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
      "startedAt": "2026-07-01T00:33:41.402Z",
      "endedAt": "2026-07-01T00:33:41.512Z",
      "durationMs": 110,
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
