# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T13-00-43-336Z-2fbd83b0
- Status: **FAIL**
- Started: 2026-07-01T13:00:43.337Z
- Ended: 2026-07-01T13:00:44.869Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 1 | Required environment is present and integration-only |
| INT01A-01 | PASS | 250 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 41 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 72 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 8 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 1098 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: [INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed

```json
{
  "errors": [
    {
      "method": "postSalesInvoice",
      "message": "[INT01B] VAT ledger dependency failed while writing VAT output"
    }
  ]
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T13-00-43-336Z-2fbd83b0",
  "status": "FAIL",
  "startedAt": "2026-07-01T13:00:43.337Z",
  "endedAt": "2026-07-01T13:00:44.869Z",
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
      "startedAt": "2026-07-01T13:00:43.337Z",
      "endedAt": "2026-07-01T13:00:43.338Z",
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
      "startedAt": "2026-07-01T13:00:43.338Z",
      "endedAt": "2026-07-01T13:00:43.588Z",
      "durationMs": 250,
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
      "startedAt": "2026-07-01T13:00:43.588Z",
      "endedAt": "2026-07-01T13:00:43.629Z",
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
      "startedAt": "2026-07-01T13:00:43.629Z",
      "endedAt": "2026-07-01T13:00:43.701Z",
      "durationMs": 72,
      "evidence": {
        "companyId": "5c9fc9c9-eb86-4c25-a0aa-51b7ba13bdfc",
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
            "id": "fe51e547-d20b-492f-a642-064983690f19",
            "exists": true
          },
          "cogs": {
            "id": "bab39a2b-14ba-4147-9a73-9797cbd2aa12",
            "exists": true
          },
          "revenue": {
            "id": "37c9be3f-50c7-4cf1-85b7-c3fee74a9df9",
            "exists": true
          },
          "expense": {
            "id": "2adb18e9-7aed-46a4-ab62-848ea2ea3a6d",
            "exists": true
          },
          "grni": {
            "id": "daf32c5c-1f47-4b51-8b19-ea0d6ea857d5",
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
      "startedAt": "2026-07-01T13:00:43.701Z",
      "endedAt": "2026-07-01T13:00:43.709Z",
      "durationMs": 8,
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
      "startedAt": "2026-07-01T13:00:43.771Z",
      "endedAt": "2026-07-01T13:00:44.869Z",
      "durationMs": 1098,
      "evidence": null,
      "error": {
        "name": "Int01bWiringError",
        "message": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed",
        "details": {
          "errors": [
            {
              "method": "postSalesInvoice",
              "message": "[INT01B] VAT ledger dependency failed while writing VAT output"
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
              "message": "[INT01B] VAT ledger dependency failed while writing VAT output"
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
          "message": "[INT01B] VAT ledger dependency failed while writing VAT output"
        }
      ]
    }
  }
}
```
