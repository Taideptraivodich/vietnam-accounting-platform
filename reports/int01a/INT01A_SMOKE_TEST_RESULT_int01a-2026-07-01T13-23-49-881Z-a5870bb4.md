# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T13-23-49-881Z-a5870bb4
- Status: **FAIL**
- Started: 2026-07-01T13:23:49.882Z
- Ended: 2026-07-01T13:23:50.700Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 0 | Required environment is present and integration-only |
| INT01A-01 | PASS | 53 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 44 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 43 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 8 | Approved module surface adapter/commands are bound |
| INT01A-05 | PASS | 497 | Post Sales / Delivery baseline through approved surface |
| INT01A-06 | FAIL | 106 | Post Purchase / GRNI baseline through approved surface |

## Failures / Open Issues

### INT01A-06 — Post Purchase / GRNI baseline through approved surface

- Error: cannot insert a non-DEFAULT value into column "unbilled_qty"

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T13-23-49-881Z-a5870bb4",
  "status": "FAIL",
  "startedAt": "2026-07-01T13:23:49.882Z",
  "endedAt": "2026-07-01T13:23:50.700Z",
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
      "startedAt": "2026-07-01T13:23:49.882Z",
      "endedAt": "2026-07-01T13:23:49.882Z",
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
      "startedAt": "2026-07-01T13:23:49.882Z",
      "endedAt": "2026-07-01T13:23:49.935Z",
      "durationMs": 53,
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
      "startedAt": "2026-07-01T13:23:49.935Z",
      "endedAt": "2026-07-01T13:23:49.979Z",
      "durationMs": 44,
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
      "startedAt": "2026-07-01T13:23:49.979Z",
      "endedAt": "2026-07-01T13:23:50.022Z",
      "durationMs": 43,
      "evidence": {
        "companyId": "e5d69ea5-758a-4054-bc09-56845a11b20e",
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
            "id": "b549ead9-d180-4a0b-8c10-223baf08cf1a",
            "exists": true
          },
          "cogs": {
            "id": "37b320af-5fb3-41e1-ab0a-bddb1a1b5435",
            "exists": true
          },
          "revenue": {
            "id": "f6f3c5a4-749d-48c5-9cf8-1a678228ced9",
            "exists": true
          },
          "expense": {
            "id": "d00a6bd8-5432-42d6-9b8d-28acb2b81852",
            "exists": true
          },
          "grni": {
            "id": "0f7ba414-074b-4ec9-b04e-c27c218df7dc",
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
      "startedAt": "2026-07-01T13:23:50.022Z",
      "endedAt": "2026-07-01T13:23:50.030Z",
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
      "status": "PASS",
      "startedAt": "2026-07-01T13:23:50.096Z",
      "endedAt": "2026-07-01T13:23:50.593Z",
      "durationMs": 497,
      "evidence": {
        "result": {
          "ok": true,
          "surface": "EW-03 Sales/Delivery approved service surface",
          "company_id": "e5d69ea5-758a-4054-bc09-56845a11b20e",
          "posting_date": "2026-07-01",
          "delivery_note_id": "f936c386-59e7-4bab-9b34-355dc60168a0",
          "sales_invoice_id": "e7a0f8c8-8388-49de-981d-c0b5a4c566ab",
          "accountingDocumentId": "fb68bc0a-7185-428e-be85-da840beb8c64",
          "accountingDocumentIds": [
            "fb68bc0a-7185-428e-be85-da840beb8c64"
          ],
          "delivery_post_result": {
            "skipped": true,
            "error": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed"
          },
          "invoice_post_result": {
            "method": "postSalesInvoice",
            "result": {
              "status": "posted",
              "id": "e7a0f8c8-8388-49de-981d-c0b5a4c566ab",
              "journal_entry_id": "fb68bc0a-7185-428e-be85-da840beb8c64"
            }
          },
          "wiring": {
            "transactionManager": "PgTransactionManager.withTransaction",
            "salesInvoiceRepository": "PostgresSalesInvoiceRepository",
            "deliveryNoteRepository": "PostgresDeliveryNoteRepository",
            "salesPostingService": "SalesPostingService",
            "glWriter": "EW-01 coreAccounting.postAccountingDocument only"
          },
          "__originalGlRowsBeforeCancel": [
            {
              "id": "472a46d4-49d6-43f4-a632-d4a7396d1501",
              "company_id": "e5d69ea5-758a-4054-bc09-56845a11b20e",
              "journal_entry_id": "fb68bc0a-7185-428e-be85-da840beb8c64",
              "journal_entry_line_id": "986e14c1-2209-4ade-9e10-4f1eab044147",
              "account_id": "0f7ba414-074b-4ec9-b04e-c27c218df7dc",
              "posting_date": "2026-06-30T17:00:00.000Z",
              "debit_amount": "0",
              "credit_amount": "100",
              "currency": "VND",
              "source_document_type": "sales_invoice",
              "source_document_id": "e7a0f8c8-8388-49de-981d-c0b5a4c566ab",
              "source_document_no": "INT01A-SI-1782912230419",
              "source_document_line_id": null,
              "party_type": null,
              "party_id": "00000000-0000-4000-8000-000000000101",
              "warehouse_id": null,
              "inventory_item_id": null,
              "inventory_ledger_entry_id": null,
              "tax_metadata": {},
              "idempotency_key": "int01a-sales-delivery-1782912230379-f7ee5f73-1869-4fb1-bad3-00e6cc05d9a5:post-invoice",
              "created_at": "2026-07-01T13:23:40.356Z"
            },
            {
              "id": "5eadb2b3-7f11-4e7b-8a6a-6ab8321b1e3a",
              "company_id": "e5d69ea5-758a-4054-bc09-56845a11b20e",
              "journal_entry_id": "fb68bc0a-7185-428e-be85-da840beb8c64",
              "journal_entry_line_id": "970bb915-90d7-4f30-b6e5-6a6eecdfd36a",
              "account_id": "f6f3c5a4-749d-48c5-9cf8-1a678228ced9",
              "posting_date": "2026-06-30T17:00:00.000Z",
              "debit_amount": "0",
              "credit_amount": "1000",
              "currency": "VND",
              "source_document_type": "sales_invoice",
              "source_document_id": "e7a0f8c8-8388-49de-981d-c0b5a4c566ab",
              "source_document_no": "INT01A-SI-1782912230419",
              "source_document_line_id": null,
              "party_type": null,
              "party_id": "00000000-0000-4000-8000-000000000101",
              "warehouse_id": null,
              "inventory_item_id": null,
              "inventory_ledger_entry_id": null,
              "tax_metadata": {},
              "idempotency_key": "int01a-sales-delivery-1782912230379-f7ee5f73-1869-4fb1-bad3-00e6cc05d9a5:post-invoice",
              "created_at": "2026-07-01T13:23:40.356Z"
            },
            {
              "id": "a7fabf93-95ed-4624-8f5f-2061eae2afcd",
              "company_id": "e5d69ea5-758a-4054-bc09-56845a11b20e",
              "journal_entry_id": "fb68bc0a-7185-428e-be85-da840beb8c64",
              "journal_entry_line_id": "9f6bbee8-a496-409b-9d86-4ad89dbb006e",
              "account_id": "b549ead9-d180-4a0b-8c10-223baf08cf1a",
              "posting_date": "2026-06-30T17:00:00.000Z",
              "debit_amount": "1100",
              "credit_amount": "0",
              "currency": "VND",
              "source_document_type": "sales_invoice",
              "source_document_id": "e7a0f8c8-8388-49de-981d-c0b5a4c566ab",
              "source_document_no": "INT01A-SI-1782912230419",
              "source_document_line_id": null,
              "party_type": null,
              "party_id": "00000000-0000-4000-8000-000000000101",
              "warehouse_id": null,
              "inventory_item_id": null,
              "inventory_ledger_entry_id": null,
              "tax_metadata": {},
              "idempotency_key": "int01a-sales-delivery-1782912230379-f7ee5f73-1869-4fb1-bad3-00e6cc05d9a5:post-invoice",
              "created_at": "2026-07-01T13:23:40.356Z"
            }
          ]
        },
        "deltas": {
          "glEntries": {
            "before": 0,
            "after": 9,
            "delta": 9
          },
          "salesInvoices": {
            "before": 0,
            "after": 1,
            "delta": 1
          },
          "arLedger": {
            "before": 0,
            "after": 1,
            "delta": 1
          }
        }
      },
      "error": null
    },
    {
      "id": "INT01A-06",
      "title": "Post Purchase / GRNI baseline through approved surface",
      "status": "FAIL",
      "startedAt": "2026-07-01T13:23:50.593Z",
      "endedAt": "2026-07-01T13:23:50.699Z",
      "durationMs": 106,
      "evidence": null,
      "error": {
        "name": "error",
        "message": "cannot insert a non-DEFAULT value into column \"unbilled_qty\""
      }
    }
  ],
  "openIssues": [
    {
      "step": "INT01A-06",
      "title": "Post Purchase / GRNI baseline through approved surface",
      "error": {
        "name": "error",
        "message": "cannot insert a non-DEFAULT value into column \"unbilled_qty\""
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
    "name": "error",
    "message": "cannot insert a non-DEFAULT value into column \"unbilled_qty\""
  }
}
```
