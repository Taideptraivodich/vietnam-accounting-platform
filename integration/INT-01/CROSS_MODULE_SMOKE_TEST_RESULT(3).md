# CROSS_MODULE_SMOKE_TEST_RESULT

**Worker:** INT-01  
**Sprint:** P0 Remediation Sprint  
**Generated at:** 2026-06-27T09:44:37Z  
**Overall result:** `FAIL / BLOCKED_BY_INPUT_PRECONDITION`  
**Production merge status:** `DO_NOT_MERGE`

## 1. Execution summary

No cross-module smoke test was executed in the active sandbox. The only locally available input is `P0_DISPATCH_INT01_UNIFIED_INTEGRATION_HARNESS.md`; the executable EW-01/EW-06/EW-02/EW-05/EW-03/EW-04/MD-01 packages, migrations, runtime manifest, and adapter surface are absent.

This is a P0 input-precondition failure, not an observed accounting invariant failure. INT-01 did not modify business modules, did not change the Accounting Engine, did not merge production, and did not add features.

## 2. Preflight result

| Check | Expected | Actual | Result |
|---|---|---|---|
| EW-01 Core Accounting / GL package | Available and runnable | Not present in active sandbox | FAIL |
| EW-06 VAT Ledger package | Available and runnable | Not present in active sandbox | FAIL |
| EW-02 AR/AP package | Available and runnable | Not present in active sandbox | FAIL |
| EW-05 Inventory package | Mergeable implementation with migrations | Not present in active sandbox | FAIL |
| EW-03 Sales / Delivery package | Available and runnable | Not present in active sandbox | FAIL |
| EW-04 Purchase / GRNI package | Available and runnable | Not present in active sandbox | FAIL |
| MD-01 Master Data baseline | Available and runnable | Not present in active sandbox | FAIL |
| Migration runner | Applies ordered baseline migrations | Not present | FAIL |
| Runtime manifest | package/build/test command surface | Not present | FAIL |
| Integration adapters | Callable services/CLI/API endpoints | Not present | FAIL |

## 3. Required smoke case result matrix

| # | Test case | Modules covered | Expected result | Actual result | PASS/FAIL |
|---:|---|---|---|---|---|
| 1 | Seed master data | MD-01, GL | Minimum accounts/account_mappings, customer, supplier, item, warehouse seeded | Not run: no MD-01/schema/migration/runtime | FAIL |
| 2 | Create company | MD-01, GL | Company row created; company isolation context available | Not run: no runnable DB/schema | FAIL |
| 3 | Create item | MD-01, Inventory | Stock item and warehouse created under company | Not run: no item/warehouse schema/runtime | FAIL |
| 4 | Purchase Receipt | Purchase, Inventory, GL | Inventory receipt posted; GRNI path available | Not run: no EW-04/EW-05/EW-01 runtime | FAIL |
| 5 | Purchase Invoice | Purchase, VAT, AP, GL, Inventory | AP/VAT/GL balanced; direct stock update verified | Not run: no EW-04/EW-06/EW-02/EW-05/EW-01 runtime | FAIL |
| 6 | Sales Delivery | Sales, Inventory, GL | Delivery stock movement and accounting effect verified | Not run: no EW-03/EW-05/EW-01 runtime | FAIL |
| 7 | Sales Invoice | Sales, VAT, AR, GL, Inventory | AR/VAT/GL balanced; update-stock path verified | Not run: no EW-03/EW-06/EW-02/EW-05/EW-01 runtime | FAIL |
| 8 | Payment | AR/AP, GL | Customer receipt and supplier payment allocations append events | Not run: no EW-02/EW-01 runtime | FAIL |
| 9 | Inventory Adjustment | Inventory, GL | Adjustment posts with reason and offset account | Not run: no EW-05/EW-01 runtime | FAIL |
| 10 | Trial Balance | GL / Reports | Debit equals credit; derived from GL only | Not run: no GL runtime/report surface | FAIL |
| 11 | Inventory Balance | Inventory | `stock_balances` reconciles to `inventory_ledger_entries` | Not run: no inventory runtime/schema | FAIL |
| 12 | Cancel document & verify reversal | Source module, GL, VAT, AR/AP, Inventory | Reversal rows inserted; originals preserved | Not run: no posted document/runtime | FAIL |

## 4. Dispatch-required extended smoke coverage

| Flow element | Expected | Actual | Result |
|---|---|---|---|
| Opening stock | Approved opening-stock flow posts inventory and offset account | Not run | FAIL |
| Sales invoice updates stock directly | Direct update-stock sales pattern posts inventory/VAT/AR/GL | Not run | FAIL |
| Delivery then invoice pattern | Delivery then invoice pattern posts correct staged inventory/accounting effects | Not run | FAIL |
| Customer receipt + AR allocation | Receipt event and AR allocation append-only | Not run | FAIL |
| Purchase receipt before invoice with GRNI | Receipt creates inventory/GRNI; invoice clears GRNI | Not run | FAIL |
| Purchase invoice direct stock update | Direct purchase stock update posts inventory/VAT/AP/GL | Not run | FAIL |
| Supplier payment + AP allocation | Payment event and AP allocation append-only | Not run | FAIL |
| VAT input/output entries | Tax ledger entries linked to source and journal | Not run | FAIL |
| Inventory ledger + stock balance query | Ledger source of truth reconciles with cache | Not run | FAIL |
| GL trial-balance-style check | Company GL debit = credit | Not run | FAIL |
| Cancel and reversal rows | Original rows preserved, reversal rows inserted | Not run | FAIL |

## 5. Invariant status

| Invariant | Status | Evidence |
|---|---|---|
| GL debit = credit | NOT ASSESSABLE | No postings executed |
| GL append-only | NOT ASSESSABLE | No GL schema/runtime available |
| AR/AP ledger append-only | NOT ASSESSABLE | No AR/AP schema/runtime available |
| AR/AP allocations append-only/cancellation-event pattern | NOT ASSESSABLE | No allocation runtime available |
| Tax ledger append-only | NOT ASSESSABLE | No VAT schema/runtime available |
| Inventory ledger append-only | NOT ASSESSABLE | No inventory schema/runtime available |
| `stock_balances` cache only | NOT ASSESSABLE | No stock balance schema/runtime available |
| Company isolation | NOT ASSESSABLE | No integrated data model available |
| No P1/P2 features | PASS BY NON-ACTION | INT-01 did not implement any feature or module change |

## 6. Result decision

`FAIL — BLOCKS FINAL MERGE`

The final gate cannot pass until executable EW and MD source/migration packages are supplied and the harness can run against a real integrated baseline. A mocked or invented pass would violate the P0 dispatch constraints.
