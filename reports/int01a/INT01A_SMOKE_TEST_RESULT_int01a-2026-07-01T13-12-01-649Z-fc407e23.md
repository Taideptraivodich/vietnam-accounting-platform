# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T13-12-01-649Z-fc407e23
- Status: **FAIL**
- Started: 2026-07-01T13:12:01.650Z
- Ended: 2026-07-01T13:12:02.155Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 1 | Required environment is present and integration-only |
| INT01A-01 | PASS | 88 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 49 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 42 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 6 | Approved module surface adapter/commands are bound |
| INT01A-05 | FAIL | 255 | Post Sales / Delivery baseline through approved surface |

## Failures / Open Issues

### INT01A-05 — Post Sales / Delivery baseline through approved surface

- Error: postSalesDelivery did not return required document identifiers

```json
{
  "acceptedKeys": [
    "accountingDocumentId",
    "accountingDocumentIds",
    "salesInvoiceId",
    "deliveryId",
    "documentId"
  ],
  "result": {
    "ok": true,
    "surface": "EW-03 Sales/Delivery approved service surface",
    "company_id": "f1c1c53f-59cb-4a55-b487-1cf675480af1",
    "posting_date": "2026-07-01",
    "delivery_note_id": "7acd7f5b-35b1-434b-b7bd-859f898dfbcc",
    "sales_invoice_id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
    "delivery_post_result": {
      "skipped": true,
      "error": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed"
    },
    "invoice_post_result": {
      "method": "postSalesInvoice",
      "result": {
        "status": "posted",
        "id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
        "journal_entry_id": "b6bbc791-740b-4178-998a-be6119c23e56"
      }
    },
    "wiring": {
      "transactionManager": "PgTransactionManager.withTransaction",
      "salesInvoiceRepository": "PostgresSalesInvoiceRepository",
      "deliveryNoteRepository": "PostgresDeliveryNoteRepository",
      "salesPostingService": "SalesPostingService",
      "glWriter": "EW-01 coreAccounting.postAccountingDocument only"
    }
  }
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T13-12-01-649Z-fc407e23",
  "status": "FAIL",
  "startedAt": "2026-07-01T13:12:01.650Z",
  "endedAt": "2026-07-01T13:12:02.155Z",
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
      "startedAt": "2026-07-01T13:12:01.650Z",
      "endedAt": "2026-07-01T13:12:01.651Z",
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
      "startedAt": "2026-07-01T13:12:01.651Z",
      "endedAt": "2026-07-01T13:12:01.739Z",
      "durationMs": 88,
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
      "startedAt": "2026-07-01T13:12:01.739Z",
      "endedAt": "2026-07-01T13:12:01.788Z",
      "durationMs": 49,
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
      "startedAt": "2026-07-01T13:12:01.788Z",
      "endedAt": "2026-07-01T13:12:01.830Z",
      "durationMs": 42,
      "evidence": {
        "companyId": "f1c1c53f-59cb-4a55-b487-1cf675480af1",
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
            "id": "eba832ca-9908-4e36-a9b4-218596b4917f",
            "exists": true
          },
          "cogs": {
            "id": "822a08d2-0c60-4bb4-9a0f-e9f0396944ae",
            "exists": true
          },
          "revenue": {
            "id": "1c179270-c133-4843-8f16-f02d631b62e4",
            "exists": true
          },
          "expense": {
            "id": "a8562c7e-0203-4f29-97dc-75b2ee83158a",
            "exists": true
          },
          "grni": {
            "id": "55c2866a-8144-4f08-939e-cd6d97e36ea2",
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
      "startedAt": "2026-07-01T13:12:01.830Z",
      "endedAt": "2026-07-01T13:12:01.836Z",
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
      "startedAt": "2026-07-01T13:12:01.900Z",
      "endedAt": "2026-07-01T13:12:02.155Z",
      "durationMs": 255,
      "evidence": null,
      "error": {
        "name": "SmokeFailure",
        "message": "postSalesDelivery did not return required document identifiers",
        "details": {
          "acceptedKeys": [
            "accountingDocumentId",
            "accountingDocumentIds",
            "salesInvoiceId",
            "deliveryId",
            "documentId"
          ],
          "result": {
            "ok": true,
            "surface": "EW-03 Sales/Delivery approved service surface",
            "company_id": "f1c1c53f-59cb-4a55-b487-1cf675480af1",
            "posting_date": "2026-07-01",
            "delivery_note_id": "7acd7f5b-35b1-434b-b7bd-859f898dfbcc",
            "sales_invoice_id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
            "delivery_post_result": {
              "skipped": true,
              "error": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed"
            },
            "invoice_post_result": {
              "method": "postSalesInvoice",
              "result": {
                "status": "posted",
                "id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
                "journal_entry_id": "b6bbc791-740b-4178-998a-be6119c23e56"
              }
            },
            "wiring": {
              "transactionManager": "PgTransactionManager.withTransaction",
              "salesInvoiceRepository": "PostgresSalesInvoiceRepository",
              "deliveryNoteRepository": "PostgresDeliveryNoteRepository",
              "salesPostingService": "SalesPostingService",
              "glWriter": "EW-01 coreAccounting.postAccountingDocument only"
            }
          }
        }
      }
    }
  ],
  "openIssues": [
    {
      "step": "INT01A-05",
      "title": "Post Sales / Delivery baseline through approved surface",
      "error": {
        "name": "SmokeFailure",
        "message": "postSalesDelivery did not return required document identifiers",
        "details": {
          "acceptedKeys": [
            "accountingDocumentId",
            "accountingDocumentIds",
            "salesInvoiceId",
            "deliveryId",
            "documentId"
          ],
          "result": {
            "ok": true,
            "surface": "EW-03 Sales/Delivery approved service surface",
            "company_id": "f1c1c53f-59cb-4a55-b487-1cf675480af1",
            "posting_date": "2026-07-01",
            "delivery_note_id": "7acd7f5b-35b1-434b-b7bd-859f898dfbcc",
            "sales_invoice_id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
            "delivery_post_result": {
              "skipped": true,
              "error": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed"
            },
            "invoice_post_result": {
              "method": "postSalesInvoice",
              "result": {
                "status": "posted",
                "id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
                "journal_entry_id": "b6bbc791-740b-4178-998a-be6119c23e56"
              }
            },
            "wiring": {
              "transactionManager": "PgTransactionManager.withTransaction",
              "salesInvoiceRepository": "PostgresSalesInvoiceRepository",
              "deliveryNoteRepository": "PostgresDeliveryNoteRepository",
              "salesPostingService": "SalesPostingService",
              "glWriter": "EW-01 coreAccounting.postAccountingDocument only"
            }
          }
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
    "name": "SmokeFailure",
    "message": "postSalesDelivery did not return required document identifiers",
    "details": {
      "acceptedKeys": [
        "accountingDocumentId",
        "accountingDocumentIds",
        "salesInvoiceId",
        "deliveryId",
        "documentId"
      ],
      "result": {
        "ok": true,
        "surface": "EW-03 Sales/Delivery approved service surface",
        "company_id": "f1c1c53f-59cb-4a55-b487-1cf675480af1",
        "posting_date": "2026-07-01",
        "delivery_note_id": "7acd7f5b-35b1-434b-b7bd-859f898dfbcc",
        "sales_invoice_id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
        "delivery_post_result": {
          "skipped": true,
          "error": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed"
        },
        "invoice_post_result": {
          "method": "postSalesInvoice",
          "result": {
            "status": "posted",
            "id": "17d8a9bb-e386-40f2-bcdf-9866977a7053",
            "journal_entry_id": "b6bbc791-740b-4178-998a-be6119c23e56"
          }
        },
        "wiring": {
          "transactionManager": "PgTransactionManager.withTransaction",
          "salesInvoiceRepository": "PostgresSalesInvoiceRepository",
          "deliveryNoteRepository": "PostgresDeliveryNoteRepository",
          "salesPostingService": "SalesPostingService",
          "glWriter": "EW-01 coreAccounting.postAccountingDocument only"
        }
      }
    }
  }
}
```
