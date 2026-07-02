# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T11-10-00-873Z-9d6b9b7e
- Status: **FAIL**
- Started: 2026-07-01T11:10:00.874Z
- Ended: 2026-07-01T11:10:01.098Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 1 | Required environment is present and integration-only |
| INT01A-01 | PASS | 47 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 34 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 35 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 5 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 51 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: INT-01C EW-05 stock precondition missing required context: itemId, warehouseId

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T11-10-00-873Z-9d6b9b7e",
  "status": "FAIL",
  "startedAt": "2026-07-01T11:10:00.874Z",
  "endedAt": "2026-07-01T11:10:01.098Z",
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
      "startedAt": "2026-07-01T11:10:00.874Z",
      "endedAt": "2026-07-01T11:10:00.875Z",
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
      "startedAt": "2026-07-01T11:10:00.875Z",
      "endedAt": "2026-07-01T11:10:00.922Z",
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
      "startedAt": "2026-07-01T11:10:00.922Z",
      "endedAt": "2026-07-01T11:10:00.956Z",
      "durationMs": 34,
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
      "startedAt": "2026-07-01T11:10:00.956Z",
      "endedAt": "2026-07-01T11:10:00.991Z",
      "durationMs": 35,
      "evidence": {
        "companyId": "7304be27-9a95-4b8f-a817-fa894f158ff0",
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
            "id": "08b46c59-22ed-4e97-83e2-afef74d1d28b",
            "exists": true
          },
          "cogs": {
            "id": "b7ac8dab-00d7-42a1-931e-c991e646110f",
            "exists": true
          },
          "revenue": {
            "id": "664d9631-1fe8-4a76-bafd-c8d002f4a791",
            "exists": true
          },
          "expense": {
            "id": "0b17853c-cce6-4980-b4d5-99bf64eab60b",
            "exists": true
          },
          "grni": {
            "id": "e887e0fe-80ce-4fda-b4d2-a63018e9d4f6",
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
      "startedAt": "2026-07-01T11:10:00.991Z",
      "endedAt": "2026-07-01T11:10:00.996Z",
      "durationMs": 5,
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
      "startedAt": "2026-07-01T11:10:01.046Z",
      "endedAt": "2026-07-01T11:10:01.097Z",
      "durationMs": 51,
      "evidence": null,
      "error": {
        "name": "Error",
        "message": "INT-01C EW-05 stock precondition missing required context: itemId, warehouseId"
      }
    }
  ],
  "openIssues": [
    {
      "step": "INT01A-05",
      "title": "Post Sales / Delivery baseline through approved surface",
      "error": {
        "name": "Error",
        "message": "INT-01C EW-05 stock precondition missing required context: itemId, warehouseId"
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
    "name": "Error",
    "message": "INT-01C EW-05 stock precondition missing required context: itemId, warehouseId"
  }
}
```
