# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-06-30T14-47-01-788Z-922eae48
- Status: **FAIL**
- Started: 2026-06-30T14:47:01.789Z
- Ended: 2026-06-30T14:47:02.067Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 0 | Required environment is present and integration-only |
| INT01A-01 | PASS | 45 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 36 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 35 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 3 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 105 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: [INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed

```json
{
  "errors": [
    {
      "method": "postSalesInvoice",
      "message": "this.salesInvoiceRepository.findWithLines is not a function"
    }
  ]
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-06-30T14-47-01-788Z-922eae48",
  "status": "FAIL",
  "startedAt": "2026-06-30T14:47:01.789Z",
  "endedAt": "2026-06-30T14:47:02.067Z",
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
      "startedAt": "2026-06-30T14:47:01.789Z",
      "endedAt": "2026-06-30T14:47:01.789Z",
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
      "startedAt": "2026-06-30T14:47:01.789Z",
      "endedAt": "2026-06-30T14:47:01.834Z",
      "durationMs": 45,
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
      "startedAt": "2026-06-30T14:47:01.834Z",
      "endedAt": "2026-06-30T14:47:01.870Z",
      "durationMs": 36,
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
      "startedAt": "2026-06-30T14:47:01.870Z",
      "endedAt": "2026-06-30T14:47:01.905Z",
      "durationMs": 35,
      "evidence": {
        "companyId": "49a8e290-385a-4184-ab53-0311d74f4dfd",
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
            "id": "decbcdf6-a029-42e6-b6e4-060771ae538f",
            "exists": true
          },
          "cogs": {
            "id": "1a89e737-6f42-4e83-8be6-190f5ffaa532",
            "exists": true
          },
          "revenue": {
            "id": "03e9efa7-5224-4f03-abb9-ddf9edeba6bc",
            "exists": true
          },
          "expense": {
            "id": "b9006966-ffcd-4bef-a7a4-39a619b2c03a",
            "exists": true
          },
          "grni": {
            "id": "da165f69-d202-4833-a26d-cdeb565624f4",
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
      "startedAt": "2026-06-30T14:47:01.905Z",
      "endedAt": "2026-06-30T14:47:01.908Z",
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
      "startedAt": "2026-06-30T14:47:01.961Z",
      "endedAt": "2026-06-30T14:47:02.066Z",
      "durationMs": 105,
      "evidence": null,
      "error": {
        "name": "Int01bWiringError",
        "message": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed",
        "details": {
          "errors": [
            {
              "method": "postSalesInvoice",
              "message": "this.salesInvoiceRepository.findWithLines is not a function"
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
              "message": "this.salesInvoiceRepository.findWithLines is not a function"
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
          "message": "this.salesInvoiceRepository.findWithLines is not a function"
        }
      ]
    }
  }
}
```
