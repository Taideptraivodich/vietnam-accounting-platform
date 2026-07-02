# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T11-48-44-434Z-4e26bd8c
- Status: **FAIL**
- Started: 2026-07-01T11:48:44.435Z
- Ended: 2026-07-01T11:48:44.816Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 0 | Required environment is present and integration-only |
| INT01A-01 | PASS | 84 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 46 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 47 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 10 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 77 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: [INT01B] Approved module surface not wired in v1.1 patch scope: postPurchaseGrni

```json
{
  "nextBlocker": "INT01A_PURCHASE_GRNI_WIRING_REQUIRED"
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T11-48-44-434Z-4e26bd8c",
  "status": "FAIL",
  "startedAt": "2026-07-01T11:48:44.435Z",
  "endedAt": "2026-07-01T11:48:44.816Z",
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
      "startedAt": "2026-07-01T11:48:44.435Z",
      "endedAt": "2026-07-01T11:48:44.435Z",
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
      "startedAt": "2026-07-01T11:48:44.435Z",
      "endedAt": "2026-07-01T11:48:44.519Z",
      "durationMs": 84,
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
      "startedAt": "2026-07-01T11:48:44.519Z",
      "endedAt": "2026-07-01T11:48:44.565Z",
      "durationMs": 46,
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
      "startedAt": "2026-07-01T11:48:44.565Z",
      "endedAt": "2026-07-01T11:48:44.612Z",
      "durationMs": 47,
      "evidence": {
        "companyId": "688cec1b-84b4-4031-9d4a-379135d24a02",
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
            "id": "f4eca832-7a74-4254-a705-55b352dd052a",
            "exists": true
          },
          "cogs": {
            "id": "db341f2f-2c03-4d09-ba06-beb667b3a424",
            "exists": true
          },
          "revenue": {
            "id": "28953565-7606-4330-bf43-232f56d23554",
            "exists": true
          },
          "expense": {
            "id": "1e31caf6-4541-4f38-8d45-e933803a743d",
            "exists": true
          },
          "grni": {
            "id": "22a1c364-d7ee-4aa2-88d0-669e34d52ca1",
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
      "startedAt": "2026-07-01T11:48:44.612Z",
      "endedAt": "2026-07-01T11:48:44.622Z",
      "durationMs": 10,
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
      "startedAt": "2026-07-01T11:48:44.739Z",
      "endedAt": "2026-07-01T11:48:44.816Z",
      "durationMs": 77,
      "evidence": null,
      "error": {
        "name": "Int01bPendingSurfaceError",
        "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: postPurchaseGrni",
        "details": {
          "nextBlocker": "INT01A_PURCHASE_GRNI_WIRING_REQUIRED"
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
        "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: postPurchaseGrni",
        "details": {
          "nextBlocker": "INT01A_PURCHASE_GRNI_WIRING_REQUIRED"
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
    "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: postPurchaseGrni",
    "details": {
      "nextBlocker": "INT01A_PURCHASE_GRNI_WIRING_REQUIRED"
    }
  }
}
```
