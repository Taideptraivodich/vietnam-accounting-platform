# INT-01A Smoke Test Result

- Runner: INT-01A_P0_v1.0
- Run ID: int01a-2026-07-01T14-36-03-885Z-ade3093e
- Status: **FAIL**
- Started: 2026-07-01T14:36:03.886Z
- Ended: 2026-07-01T14:36:05.819Z
- NODE_ENV: integration
- DATABASE_URL: postgres://postgres:***@127.0.0.1:15432/local_final_gate

## Step Summary

| Step | Status | Duration ms | Title |
|---|---:|---:|---|
| INT01A-00 | PASS | 1 | Required environment is present and integration-only |
| INT01A-01 | PASS | 50 | Database connectivity uses real PostgreSQL |
| INT01A-02 | PASS | 42 | Migrations already applied / freeze-scope tables exist |
| INT01A-03 | PASS | 38 | MD-01 seed/preseed real master data exists |
| INT01A-04 | PASS | 7 | Approved module surface adapter/commands are bound |
| INT01A-05 | PASS | 506 | Post Sales / Delivery baseline through approved surface |
| INT01A-06 | PASS | 373 | Post Purchase / GRNI baseline through approved surface |
| INT01A-07 | PASS | 300 | Post VAT ledger baseline / source linkage |
| INT01A-08 | PASS | 185 | Post AR/AP settlement through approved surface |
| INT01A-09 | PASS | 289 | Post inventory movement / adjustment through approved surface |
| INT01A-10 | PASS | 4 | Query GL entries and verify Debit = Credit for all smoke documents |
| INT01A-11 | PASS | 17 | Verify company_id isolation for freeze-scope ledgers |
| INT01A-12 | FAIL | 63 | Cancel one document and verify append-only reversal |

## Failures / Open Issues

### INT01A-12 — Cancel one document and verify append-only reversal

- Error: [INT01B] Approved module surface not wired in v1.1 patch scope: cancelDocument

```json
{
  "nextBlocker": "INT01A_CANCEL_REVERSAL_WIRING_REQUIRED"
}
```

## Full Evidence

```json
{
  "runner": "INT-01A_P0_v1.0",
  "runId": "int01a-2026-07-01T14-36-03-885Z-ade3093e",
  "status": "FAIL",
  "startedAt": "2026-07-01T14:36:03.886Z",
  "endedAt": "2026-07-01T14:36:05.819Z",
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
      "startedAt": "2026-07-01T14:36:03.886Z",
      "endedAt": "2026-07-01T14:36:03.887Z",
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
      "startedAt": "2026-07-01T14:36:03.887Z",
      "endedAt": "2026-07-01T14:36:03.937Z",
      "durationMs": 50,
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
      "startedAt": "2026-07-01T14:36:03.937Z",
      "endedAt": "2026-07-01T14:36:03.979Z",
      "durationMs": 42,
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
      "startedAt": "2026-07-01T14:36:03.979Z",
      "endedAt": "2026-07-01T14:36:04.017Z",
      "durationMs": 38,
      "evidence": {
        "companyId": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
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
            "id": "90f56128-71db-47bd-87fb-aac895baf29c",
            "exists": true
          },
          "cogs": {
            "id": "d2f0c718-d278-4245-b9a4-f3007e932ef4",
            "exists": true
          },
          "revenue": {
            "id": "59ca7b98-b14a-44ce-a640-0e3d838e29e6",
            "exists": true
          },
          "expense": {
            "id": "c4cc19a1-5360-403a-bd79-50307b207b8e",
            "exists": true
          },
          "grni": {
            "id": "f8ac288e-13d8-4f43-ae8c-28f2e255cda8",
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
      "startedAt": "2026-07-01T14:36:04.017Z",
      "endedAt": "2026-07-01T14:36:04.024Z",
      "durationMs": 7,
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
      "startedAt": "2026-07-01T14:36:04.082Z",
      "endedAt": "2026-07-01T14:36:04.588Z",
      "durationMs": 506,
      "evidence": {
        "result": {
          "ok": true,
          "surface": "EW-03 Sales/Delivery approved service surface",
          "company_id": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
          "posting_date": "2026-07-01",
          "delivery_note_id": "62e44954-98a0-4876-bf71-44a3d86235fa",
          "sales_invoice_id": "db5aed55-a0db-4519-a248-04536581c557",
          "accountingDocumentId": "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef",
          "accountingDocumentIds": [
            "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef"
          ],
          "delivery_post_result": {
            "skipped": true,
            "error": "[INT01B] SalesPostingService did not expose a compatible posting method or all posting attempts failed"
          },
          "invoice_post_result": {
            "method": "postSalesInvoice",
            "result": {
              "status": "posted",
              "id": "db5aed55-a0db-4519-a248-04536581c557",
              "journal_entry_id": "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef"
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
              "id": "03cbaae7-1167-4214-b894-ecedde27c1b7",
              "company_id": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
              "journal_entry_id": "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef",
              "journal_entry_line_id": "52a0d1e5-f455-4c99-8f6f-0f4fecb2bca9",
              "account_id": "f8ac288e-13d8-4f43-ae8c-28f2e255cda8",
              "posting_date": "2026-06-30T17:00:00.000Z",
              "debit_amount": "0",
              "credit_amount": "100",
              "currency": "VND",
              "source_document_type": "sales_invoice",
              "source_document_id": "db5aed55-a0db-4519-a248-04536581c557",
              "source_document_no": "INT01A-SI-1782916564257",
              "source_document_line_id": null,
              "party_type": null,
              "party_id": "00000000-0000-4000-8000-000000000101",
              "warehouse_id": null,
              "inventory_item_id": null,
              "inventory_ledger_entry_id": null,
              "tax_metadata": {},
              "idempotency_key": "int01a-sales-delivery-1782916564217-7cc21d9c-d541-4300-9129-8f975d7cb5f5:post-invoice",
              "created_at": "2026-07-01T14:35:53.912Z"
            },
            {
              "id": "62fe203c-295f-419c-9df5-ecffb2333e72",
              "company_id": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
              "journal_entry_id": "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef",
              "journal_entry_line_id": "0407d5cf-2669-47e1-bb6b-6ae2c3153f14",
              "account_id": "59ca7b98-b14a-44ce-a640-0e3d838e29e6",
              "posting_date": "2026-06-30T17:00:00.000Z",
              "debit_amount": "0",
              "credit_amount": "1000",
              "currency": "VND",
              "source_document_type": "sales_invoice",
              "source_document_id": "db5aed55-a0db-4519-a248-04536581c557",
              "source_document_no": "INT01A-SI-1782916564257",
              "source_document_line_id": null,
              "party_type": null,
              "party_id": "00000000-0000-4000-8000-000000000101",
              "warehouse_id": null,
              "inventory_item_id": null,
              "inventory_ledger_entry_id": null,
              "tax_metadata": {},
              "idempotency_key": "int01a-sales-delivery-1782916564217-7cc21d9c-d541-4300-9129-8f975d7cb5f5:post-invoice",
              "created_at": "2026-07-01T14:35:53.912Z"
            },
            {
              "id": "a5e922ce-8bed-4ed9-9a23-6d49e9b34bca",
              "company_id": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
              "journal_entry_id": "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef",
              "journal_entry_line_id": "ccb2fcd8-8e9b-4527-9523-0a776eda3d64",
              "account_id": "90f56128-71db-47bd-87fb-aac895baf29c",
              "posting_date": "2026-06-30T17:00:00.000Z",
              "debit_amount": "1100",
              "credit_amount": "0",
              "currency": "VND",
              "source_document_type": "sales_invoice",
              "source_document_id": "db5aed55-a0db-4519-a248-04536581c557",
              "source_document_no": "INT01A-SI-1782916564257",
              "source_document_line_id": null,
              "party_type": null,
              "party_id": "00000000-0000-4000-8000-000000000101",
              "warehouse_id": null,
              "inventory_item_id": null,
              "inventory_ledger_entry_id": null,
              "tax_metadata": {},
              "idempotency_key": "int01a-sales-delivery-1782916564217-7cc21d9c-d541-4300-9129-8f975d7cb5f5:post-invoice",
              "created_at": "2026-07-01T14:35:53.912Z"
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
      "status": "PASS",
      "startedAt": "2026-07-01T14:36:04.588Z",
      "endedAt": "2026-07-01T14:36:04.961Z",
      "durationMs": 373,
      "evidence": {
        "result": {
          "ok": true,
          "surface": "EW-04 Purchase/GRNI approved service surface",
          "company_id": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
          "posting_date": "2026-07-01",
          "purchase_receipt_id": "321f79fc-854d-4ba3-81fe-e8ee293bbecb",
          "purchase_invoice_id": "77392064-0cc6-4eb3-9ea1-b57134214a24",
          "accountingDocumentId": "436da964-033b-4ee0-9d1c-7ed7457a2b1b",
          "accountingDocumentIds": [
            "944be263-c998-4b57-93a2-0bd881d3cc0e",
            "436da964-033b-4ee0-9d1c-7ed7457a2b1b"
          ],
          "receipt_post_result": {
            "journal_entry_id": "944be263-c998-4b57-93a2-0bd881d3cc0e",
            "gl_entry_ids": [
              "a0dde98e-5d23-4ca4-a47c-da86e99babe3",
              "303b891d-68be-411c-98d1-e1f5bbaf6aa4"
            ],
            "source_document_type": "purchase_receipt",
            "source_document_id": "321f79fc-854d-4ba3-81fe-e8ee293bbecb",
            "source_document_no": "INT01A-PR-1782916564821",
            "status": "POSTED",
            "idempotent": false
          },
          "invoice_post_result": {
            "journal_entry_id": "436da964-033b-4ee0-9d1c-7ed7457a2b1b",
            "gl_entry_ids": [
              "a4b765d9-c904-4979-a61a-9282913fd45d",
              "401d21f1-4d12-447c-9536-543331d35b11"
            ],
            "source_document_type": "purchase_invoice",
            "source_document_id": "77392064-0cc6-4eb3-9ea1-b57134214a24",
            "source_document_no": "INT01A-PI-1782916564821",
            "status": "POSTED",
            "idempotent": false
          },
          "wiring": {
            "purchaseReceipt": "purchase_receipts schema bridge",
            "purchaseInvoice": "purchase_invoices schema bridge",
            "glWriter": "EW-01 PostingService.postAccountingDocument only",
            "apLedger": "ar_ap_ledger_entries supplier outstanding"
          }
        },
        "deltas": {
          "glEntries": {
            "before": 9,
            "after": 13,
            "delta": 4
          },
          "purchaseReceipts": {
            "before": 0,
            "after": 1,
            "delta": 1
          },
          "purchaseInvoices": {
            "before": 0,
            "after": 1,
            "delta": 1
          },
          "apLedger": {
            "before": 1,
            "after": 2,
            "delta": 1
          }
        }
      },
      "error": null
    },
    {
      "id": "INT01A-07",
      "title": "Post VAT ledger baseline / source linkage",
      "status": "PASS",
      "startedAt": "2026-07-01T14:36:04.961Z",
      "endedAt": "2026-07-01T14:36:05.261Z",
      "durationMs": 300,
      "evidence": {
        "explicitVatResult": null,
        "vatDeltaSinceInitial": 1,
        "linkage": [
          {
            "column": "journal_entry_id",
            "ids": [
              "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef",
              "436da964-033b-4ee0-9d1c-7ed7457a2b1b",
              "944be263-c998-4b57-93a2-0bd881d3cc0e"
            ],
            "count": 1
          }
        ]
      },
      "error": null
    },
    {
      "id": "INT01A-08",
      "title": "Post AR/AP settlement through approved surface",
      "status": "PASS",
      "startedAt": "2026-07-01T14:36:05.261Z",
      "endedAt": "2026-07-01T14:36:05.446Z",
      "durationMs": 185,
      "evidence": {
        "result": {
          "ok": true,
          "surface": "AR/AP settlement approved surface",
          "company_id": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
          "posting_date": "2026-07-01",
          "settlementId": "f8555490-27e6-4af0-bca4-bf199acd8d23",
          "allocationId": "86d1962b-224d-4441-a7a8-ee926bd26abc",
          "accountingDocumentId": "707521d5-9daa-4204-80f1-4f0e8b78f6ac",
          "accountingDocumentIds": [
            "707521d5-9daa-4204-80f1-4f0e8b78f6ac"
          ],
          "invoiceLedgerEntryId": "a591ba13-6caf-4eae-a78c-6d0d873c9cfc",
          "paymentLedgerEntryId": "3f4dcfa1-155f-48a1-baf1-f789e387566c",
          "amount": 1000,
          "wiring": {
            "allocation": "ar_ap_allocations append-only allocated event",
            "glWriter": "EW-01 PostingService.postAccountingDocument only",
            "side": "purchase/AP only to avoid blocking sales cancel smoke"
          }
        },
        "deltas": {
          "glEntries": {
            "before": 13,
            "after": 15,
            "delta": 2
          },
          "arapAllocations": {
            "before": 0,
            "after": 1,
            "delta": 1
          }
        }
      },
      "error": null
    },
    {
      "id": "INT01A-09",
      "title": "Post inventory movement / adjustment through approved surface",
      "status": "PASS",
      "startedAt": "2026-07-01T14:36:05.446Z",
      "endedAt": "2026-07-01T14:36:05.735Z",
      "durationMs": 289,
      "evidence": {
        "result": {
          "entry": {
            "id": "2d538b93-8bd5-408b-91b8-e609f091fccf",
            "company_id": "132b59e2-1ea9-4769-a64b-e658b1b892a3",
            "item_id": "00000000-0000-4000-8000-000000000401",
            "warehouse_id": "00000000-0000-4000-8000-000000000301",
            "posting_date": "2026-07-01",
            "posting_time": "00:00:00",
            "source_document_type": "INT01D_EW05_STOCK_PRECONDITION",
            "source_document_id": "bde60abf-3280-41e2-8457-11f0d56aa311",
            "source_document_line_id": null,
            "movement_type": "inventory_adjustment",
            "quantity_change": 10,
            "qty_after_transaction": 16,
            "valuation_rate": 100,
            "stock_value": 1600,
            "stock_value_difference": 1000,
            "transfer_group_id": null,
            "transfer_pair_id": null,
            "is_reversal": false,
            "reverses_inventory_ledger_entry_id": null
          },
          "accountingResult": {
            "journal_entry_id": "78628eb0-029d-470d-b083-1f766809becc",
            "gl_entry_ids": [
              "1487e371-d00a-4f0c-80de-5f5c248741a2",
              "93746362-692a-433f-84f5-1b1939196e8f"
            ],
            "source_document_type": "INT01D_EW05_STOCK_PRECONDITION",
            "source_document_id": "bde60abf-3280-41e2-8457-11f0d56aa311",
            "source_document_no": null,
            "status": "POSTED",
            "idempotent": false
          },
          "accountingDocumentId": "78628eb0-029d-470d-b083-1f766809becc",
          "accountingDocumentIds": [
            "78628eb0-029d-470d-b083-1f766809becc"
          ],
          "inventoryLedgerEntryId": "2d538b93-8bd5-408b-91b8-e609f091fccf",
          "inventoryLedgerEntryIds": [
            "2d538b93-8bd5-408b-91b8-e609f091fccf"
          ],
          "documentId": "78628eb0-029d-470d-b083-1f766809becc",
          "int01dApprovedSurface": "EW-05",
          "int01dApprovedMethod": "postInventoryAdjustment"
        },
        "deltas": {
          "glEntries": {
            "before": 15,
            "after": 17,
            "delta": 2
          },
          "inventoryLedger": {
            "before": 3,
            "after": 4,
            "delta": 1
          }
        },
        "linkage": {
          "checked": [
            {
              "table": "inventoryLedger",
              "column": "source_document_id",
              "ids": [
                "78628eb0-029d-470d-b083-1f766809becc"
              ],
              "count": 0
            },
            {
              "table": "glEntries",
              "column": "inventory_ledger_entry_id",
              "ids": [
                "2d538b93-8bd5-408b-91b8-e609f091fccf"
              ],
              "count": 2
            }
          ]
        }
      },
      "error": null
    },
    {
      "id": "INT01A-10",
      "title": "Query GL entries and verify Debit = Credit for all smoke documents",
      "status": "PASS",
      "startedAt": "2026-07-01T14:36:05.735Z",
      "endedAt": "2026-07-01T14:36:05.739Z",
      "durationMs": 4,
      "evidence": {
        "documentIds": [
          "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef",
          "436da964-033b-4ee0-9d1c-7ed7457a2b1b",
          "944be263-c998-4b57-93a2-0bd881d3cc0e",
          "707521d5-9daa-4204-80f1-4f0e8b78f6ac",
          "78628eb0-029d-470d-b083-1f766809becc"
        ],
        "sums": [
          {
            "documentId": "436da964-033b-4ee0-9d1c-7ed7457a2b1b",
            "debit": 1000,
            "credit": 1000,
            "rowCount": 2,
            "companyCount": 1
          },
          {
            "documentId": "456e9cb8-1d6c-4d8a-a7f5-f8de1e0a6eef",
            "debit": 1100,
            "credit": 1100,
            "rowCount": 3,
            "companyCount": 1
          },
          {
            "documentId": "707521d5-9daa-4204-80f1-4f0e8b78f6ac",
            "debit": 1000,
            "credit": 1000,
            "rowCount": 2,
            "companyCount": 1
          },
          {
            "documentId": "78628eb0-029d-470d-b083-1f766809becc",
            "debit": 1000,
            "credit": 1000,
            "rowCount": 2,
            "companyCount": 1
          },
          {
            "documentId": "944be263-c998-4b57-93a2-0bd881d3cc0e",
            "debit": 1000,
            "credit": 1000,
            "rowCount": 2,
            "companyCount": 1
          }
        ]
      },
      "error": null
    },
    {
      "id": "INT01A-11",
      "title": "Verify company_id isolation for freeze-scope ledgers",
      "status": "PASS",
      "startedAt": "2026-07-01T14:36:05.739Z",
      "endedAt": "2026-07-01T14:36:05.756Z",
      "durationMs": 17,
      "evidence": {
        "glEntries": {
          "companyColumn": "company_id",
          "checkedWithDocumentIds": true,
          "badRows": 0
        },
        "vatLedger": {
          "companyColumn": "company_id",
          "checkedWithDocumentIds": true,
          "badRows": 0
        },
        "arLedger": {
          "companyColumn": "company_id",
          "checkedWithDocumentIds": true,
          "badRows": 0
        },
        "apLedger": {
          "companyColumn": "company_id",
          "checkedWithDocumentIds": true,
          "badRows": 0
        },
        "inventoryLedger": {
          "companyColumn": "company_id",
          "checkedWithDocumentIds": true,
          "badRows": 0
        }
      },
      "error": null
    },
    {
      "id": "INT01A-12",
      "title": "Cancel one document and verify append-only reversal",
      "status": "FAIL",
      "startedAt": "2026-07-01T14:36:05.756Z",
      "endedAt": "2026-07-01T14:36:05.819Z",
      "durationMs": 63,
      "evidence": null,
      "error": {
        "name": "Int01bPendingSurfaceError",
        "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: cancelDocument",
        "details": {
          "nextBlocker": "INT01A_CANCEL_REVERSAL_WIRING_REQUIRED"
        }
      }
    }
  ],
  "openIssues": [
    {
      "step": "INT01A-12",
      "title": "Cancel one document and verify append-only reversal",
      "error": {
        "name": "Int01bPendingSurfaceError",
        "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: cancelDocument",
        "details": {
          "nextBlocker": "INT01A_CANCEL_REVERSAL_WIRING_REQUIRED"
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
    "message": "[INT01B] Approved module surface not wired in v1.1 patch scope: cancelDocument",
    "details": {
      "nextBlocker": "INT01A_CANCEL_REVERSAL_WIRING_REQUIRED"
    }
  }
}
```
