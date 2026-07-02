# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T11-13-30-792Z-4ab07f9a
- Status: **FAIL**
- Started: 2026-07-01T11:13:30.793Z
- Ended: 2026-07-01T11:13:31.018Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 1 | Required environment is present and integration-only |
| INT01A-01 | PASS | 44 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 35 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 35 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 3 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 53 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: [INT01B] Approved module surface not wired in v1.1 patch scope: postInventoryAdjustment

```json
{
  "nextBlocker": "INT01A_INVENTORY_ADJUSTMENT_WIRING_REQUIRED"
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T11-13-30-792Z-4ab07f9a",
  "status": "FAIL",
  "startedAt": "2026-07-01T11:13:30.793Z",
  "endedAt": "2026-07-01T11:13:31.018Z",
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
      "startedAt": "2026-07-01T11:13:30.793Z",
      "endedAt": "2026-07-01T11:13:30.794Z",
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
      "startedAt": "2026-07-01T11:13:30.794Z",
      "endedAt": "2026-07-01T11:13:30.838Z",
      "durationMs": 44,
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
      "startedAt": "2026-07-01T11:13:30.838Z",
      "endedAt": "2026-07-01T11:13:30.873Z",
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
      "startedAt": "2026-07-01T11:13:30.873Z",
      "endedAt": "2026-07-01T11:13:30.908Z",
      "durationMs": 35,
      "evidence": {
        "companyId": "f3d7f8f2-30e1-4a3b-9ebd-311303c8ef0f",
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
            "id": "97ec1022-a829-468f-a57b-8a3c04d86bf7",
            "exists": true
          },
          "cogs": {
            "id": "de17a75c-c576-4679-be8c-557b4227b5d9",
            "exists": true
          },
          "revenue": {
            "id": "95b59a3d-5243-48c6-b0ea-cbb49d2e79d6",
            "exists": true
          },
          "expense": {
            "id": "9e6a909d-6147-41d2-8358-6109bf10318f",
            "exists": true
          },
          "grni": {
            "id": "9f9de13c-3da0-43f6-897a-3893cb701b72",
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
      "startedAt": "2026-07-01T11:13:30.908Z",
      "endedAt": "2026-07-01T11:13:30.911Z",
      "durationMs": 3,
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
      "startedAt": "2026-07-01T11:13:30.964Z",
      "endedAt": "2026-07-01T11:13:31.017Z",
      "durationMs": 53,
      "evidence": null,
      "error": {
        "name": "Int01bPendingSurfaceError",
        "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: postInventoryAdjustment",
        "details": {
          "nextBlocker": "INT01A_INVENTORY_ADJUSTMENT_WIRING_REQUIRED"
        }
      }
    }
  ],
  "openIssues": [
    {
      "step": "INT01A-05",
      "title": "Post Sales / Delivery baseline through approved surface",
      "error": {
        "name": "Int01bPendingSurfaceError",
        "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: postInventoryAdjustment",
        "details": {
          "nextBlocker": "INT01A_INVENTORY_ADJUSTMENT_WIRING_REQUIRED"
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
    "name": "Int01bPendingSurfaceError",
    "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: postInventoryAdjustment",
    "details": {
      "nextBlocker": "INT01A_INVENTORY_ADJUSTMENT_WIRING_REQUIRED"
    }
  }
}
```
