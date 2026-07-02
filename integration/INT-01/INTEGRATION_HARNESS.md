# INTEGRATION_HARNESS

**Worker:** INT-01 — Integration Worker  
**Sprint:** P0 Remediation Sprint  
**Generated at:** 2026-06-27T09:44:37Z  
**Scope status:** Harness-only. No business module code, Accounting Engine code, production branch, or P1/P2 feature change was made.

## 1. Purpose

This document defines the Unified Integration Harness required to verify Freeze Scope v1.0 across:

- GL / Core Accounting
- VAT ledger
- AR/AP ledger and allocation
- Inventory ledger and stock balance
- Sales / Delivery
- Purchase / GRNI
- Master Data baseline

The harness is intentionally bounded to integration verification. It must compose already-accepted EW packages and execute cross-module smoke tests. It must not modify business modules, change the Accounting Engine, merge production, or add features.

## 2. Current execution status

`BLOCKED_BY_INPUT_PRECONDITION`

The active sandbox contains the INT-01 dispatch file, but no executable repository, module source packages, migration directory, package manager manifest, runtime configuration, or integrated baseline to compose. Therefore the harness is specified and packaged, but the smoke flow cannot be executed in this workspace without inventing schema/modules, which is outside INT-01 permission.

Active sandbox file inventory at generation time:

```text
P0_DISPATCH_INT01_UNIFIED_INTEGRATION_HARNESS.md
```

## 3. Required input adapters

The harness expects each module to expose either a stable service adapter or a deterministic CLI/API entrypoint. INT-01 does not define business logic inside these adapters; it only calls them.

| Adapter | Required module | Required responsibility | Must not do |
|---|---|---|---|
| `glAdapter` | EW-01 Core Accounting / GL | Company-scoped posting, trial-balance query, reversal verification, append-only checks | No direct test-only bypass of GL invariants |
| `vatAdapter` | EW-06 VAT Ledger | VAT input/output ledger insertion/query through accepted contract | No advanced VAT features outside Freeze v1.0 |
| `arApAdapter` | EW-02 AR/AP | AR/AP ledger entries, allocations, receipt/payment allocation, reversal events | No mutation/deletion of posted ledger/allocation rows |
| `inventoryAdapter` | EW-05 Inventory | Opening stock, inventory adjustment, inventory ledger query, stock balance rebuild/cache check | No FIFO, serial/batch, landed cost, revaluation/repost feature |
| `salesAdapter` | EW-03 Sales / Delivery | Sales invoice update-stock pattern, delivery-then-invoice pattern, sales cancel path | No direct GL writes outside Core Accounting |
| `purchaseAdapter` | EW-04 Purchase / GRNI | Purchase receipt before invoice with GRNI, direct-stock purchase invoice, supplier payment path | No purchase-before-receipt feature outside Freeze v1.0 |
| `masterDataAdapter` | MD-01 Master Data | Company, accounts, account mappings, customer, supplier, item, warehouse seed | No full TT99 COA seed beyond minimum smoke data |

## 4. Harness architecture

```text
integration-harness/
  config/
    harness.env.example
    smoke-fixture.v1.json
  adapters/
    glAdapter.*
    vatAdapter.*
    arApAdapter.*
    inventoryAdapter.*
    salesAdapter.*
    purchaseAdapter.*
    masterDataAdapter.*
  runners/
    preflight
    migrate
    seed
    smoke
    invariants
    cleanup
  reports/
    CROSS_MODULE_SMOKE_TEST_RESULT.md
    OPEN_ISSUES.md
    FINAL_RECOMMENDATION.md
```

Execution model:

```text
1. preflight: validate all required package/source/migration/adapter inputs exist
2. migrate: apply accepted migrations in required assembly order
3. seed: create minimum master data only
4. smoke: run end-to-end source-document flow
5. invariants: query and verify ledger/cache invariants
6. cancel: cancel one posted document and verify reversal rows
7. report: write result, open issues, final recommendation
```

## 5. Preflight gates

The harness must stop before execution if any of the following are missing:

| Gate | Required evidence | Failure severity |
|---|---|---|
| Source packages | EW-01, EW-06, EW-02, EW-05, EW-03, EW-04, MD-01 package roots or branch checkout | P0 |
| Migration path | Ordered migration files for all required schemas | P0 |
| Runtime manifest | package/build/test manifest or equivalent runnable command surface | P0 |
| Adapter surface | callable API/CLI/service contracts for every module | P0 |
| Master-data schema | company, account, account_mappings, customer, supplier, item, warehouse | P0 |
| Inventory schema | `inventory_ledger_entries`, `stock_balances` | P0 |
| Append-only guards | GL, AR/AP, allocation, VAT, inventory ledger mutation protection | P0 |
| Company isolation | `company_id` carried across all documents and ledger effects | P0 |

## 6. Required assembly order

```text
1. EW-01 Core Accounting / GL foundation
2. EW-06 VAT ledger baseline schema/contract
3. EW-02 AR/AP ledger + allocation
4. EW-05 Inventory ledger + stock balance baseline
5. EW-03 Sales / Delivery baseline
6. EW-04 Purchase / GRNI baseline
7. MD-01 Master Data minimum seed, if not already covered by a separate migration/package
8. Cross-module smoke tests
9. Final gate reports
```

If the accepted baseline requires MD-01 before module migration, the harness may run MD-01 schema migration earlier. It must not invent missing master-data tables as an integration-worker patch.

## 7. Minimum seed data contract

| Entity | Required fields / intent |
|---|---|
| Company | isolated `company_id`, base currency VND, active fiscal period |
| Accounts | cash/bank, receivable, payable, revenue, COGS, inventory, VAT input, VAT output, GRNI/goods-received-not-invoiced, opening-stock offset, inventory-adjustment offset |
| Account mappings | company-scoped mappings from business purpose to canonical `accounts.id` |
| Customer | one active customer under company |
| Supplier | one active supplier under company |
| Item | one stock item, moving-average valuation, VAT-applicable |
| Warehouse | one main warehouse under company |
| Opening stock | positive quantity and value through approved inventory opening-stock flow |

## 8. Smoke flow

The harness must execute the following minimum end-to-end flow in a clean company context:

| # | Step | Modules touched | Expected verification |
|---:|---|---|---|
| 1 | Seed master data | MD-01, GL | minimum accounts/account_mappings and parties/items/warehouse exist |
| 2 | Create company | MD-01, GL | company created; all later rows scoped to company |
| 3 | Create item | MD-01, Inventory | item and warehouse available for stock movement |
| 4 | Purchase Receipt | Purchase, Inventory, GL | inventory ledger increases stock; GRNI/clearing path ready where applicable |
| 5 | Purchase Invoice | Purchase, VAT, AP, GL, Inventory | AP/VAT/GL balanced; direct-stock path supported where selected |
| 6 | Sales Delivery | Sales, Inventory, GL | delivery-then-invoice inventory movement recorded |
| 7 | Sales Invoice | Sales, VAT, AR, GL, Inventory | AR/VAT/GL balanced; update-stock direct pattern also covered |
| 8 | Payment | AR/AP, GL | customer receipt and supplier payment allocations append events |
| 9 | Inventory Adjustment | Inventory, GL | adjustment requires reason/offset and posts atomic inventory + GL effect |
| 10 | Trial Balance | GL / Reports | debit equals credit; report derives from GL only |
| 11 | Inventory Balance | Inventory | `stock_balances` cache equals rebuild from `inventory_ledger_entries` |
| 12 | Cancel document & verify reversal | Source module, GL, VAT, AR/AP, Inventory | original rows preserved; reversal rows inserted; allocation cancellation-event pattern used |

Additional dispatch-required coverage:

```text
- Opening stock
- Sales invoice updates stock directly
- Delivery then invoice pattern
- Customer receipt + AR allocation
- Purchase receipt before invoice with GRNI
- Purchase invoice direct stock update
- Supplier payment + AP allocation
- VAT input/output ledger entries
- Inventory ledger + stock balance query
- GL query / trial-balance-style debit-credit check
```

## 9. Invariant assertions

The smoke result is a hard FAIL if any assertion below fails:

| Invariant | Assertion |
|---|---|
| GL debit = credit | Sum debit equals sum credit for every posted journal and for company trial balance |
| GL append-only | Posted GL rows are not updated/deleted; cancellation uses reversal rows |
| AR/AP ledger append-only | Monetary ledger events are inserted only; no update/delete of posted rows |
| AR/AP allocations append-only | Allocation changes use cancellation/reversal events, not mutation of original allocation |
| VAT ledger append-only | Tax ledger entries are inserted only; cancellation creates reversal entries |
| Inventory ledger append-only | `inventory_ledger_entries` are source-of-truth movement rows and are not deleted |
| Stock balance cache | `stock_balances` is rebuildable cache only and must reconcile to ledger |
| Company isolation | No cross-company source document, party, account, ledger, stock, or allocation link |
| No P1/P2 | No FIFO, landed cost, serial/batch, manufacturing, full TT99 seed, or other deferred features |

## 10. Fail-fast policy

The harness must report `FAIL / BLOCKED` instead of fabricating data or patching business modules if:

- a required package or migration is absent;
- a required table/adapter cannot be found;
- any source module directly writes GL outside Core Accounting;
- trial balance cannot be derived from GL;
- stock balance cannot be rebuilt from inventory ledger;
- cancel requires mutation of posted rows instead of reversal;
- an issue would require changing the Accounting Engine or expanding feature scope.

## 11. Required issue format

Every discovered issue must be recorded with:

```text
- module
- severity
- reproduction steps
- expected vs actual
```

## 12. Harness decision for this run

`HARNESS_SPEC_CREATED — EXECUTION_BLOCKED`

The unified harness coverage is defined above, but the current workspace cannot run it because the executable EW/MD packages and migrations are not present. Creating schema stubs, mock modules, or business-module patches would violate the dispatch restrictions.
