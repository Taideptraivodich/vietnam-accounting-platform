# OPEN_ISSUES

**Worker:** INT-01  
**Sprint:** P0 Remediation Sprint  
**Generated at:** 2026-06-27T09:44:37Z  
**Status:** Open P0 blockers remain.

## Issue summary

| Issue ID | Module | Severity | Blocks final merge? | Classification | Summary |
|---|---|---:|---:|---|---|
| INT01-P0-001 | Integration / All modules | P0 | YES | Missing executable baseline | Active sandbox lacks EW-01/EW-06/EW-02/EW-05/EW-03/EW-04/MD-01 source packages and runnable composition surface |
| INT01-P0-002 | Database / Migrations | P0 | YES | Missing migrations | No ordered migration files or migration runner are present for GL, VAT, AR/AP, Inventory, Sales, Purchase, or Master Data |
| INT01-P0-003 | MD-01 Master Data | P0 | YES | Missing schema dependency | Company, customer, supplier, item, warehouse, and minimum account mapping creation cannot be verified without MD-01 baseline |
| INT01-P0-004 | EW-05 Inventory | P0 | YES | Missing inventory integration surface | `inventory_ledger_entries` and `stock_balances` cannot be verified in active workspace |
| INT01-P0-005 | Cross-module Harness Runtime | P0 | YES | Runnable harness gap | No callable adapter/API/CLI surface exists for end-to-end Sales/Purchase/Inventory/VAT/AR/AP/GL smoke |

## INT01-P0-001 — Missing executable baseline

**Module:** Integration / GL / VAT / AR/AP / Inventory / Sales / Purchase / MD-01  
**Severity:** P0  
**Blocks final merge:** YES

### Reproduction steps

1. Inspect active sandbox file inventory.
2. Confirm only the INT-01 dispatch file is present as an input artifact.
3. Attempt to locate module roots, branch checkout, migrations, package manifest, or test runner.
4. No executable module baseline is found.

### Expected

Accepted EW and MD packages are available with source code, migrations, test commands, and a composition surface that INT-01 can call without changing business logic.

### Actual

No executable module packages are present in the active sandbox. The unified smoke harness cannot run without inventing or altering business code.

### Required remediation

Provide a complete executable integration input bundle or repository checkout containing the accepted packages and migration order.

## INT01-P0-002 — Missing migration path

**Module:** Database / Migrations  
**Severity:** P0  
**Blocks final merge:** YES

### Reproduction steps

1. Search the active sandbox for migration directories/files.
2. Search for migration runner or database initialization command.
3. No migration path is available.

### Expected

Ordered migrations exist for EW-01, EW-06, EW-02, EW-05, EW-03, EW-04, and MD-01, with a clean database apply path and rollback/cleanup strategy where applicable.

### Actual

No migration files or runner are present in the current workspace.

### Required remediation

Supply ordered, approved migrations. INT-01 must not create missing business schema as a harness patch.

## INT01-P0-003 — Missing master-data baseline

**Module:** MD-01 Master Data  
**Severity:** P0  
**Blocks final merge:** YES

### Reproduction steps

1. Run preflight for company, account, account mapping, customer, supplier, item, and warehouse schema availability.
2. Required schema/runtime cannot be found.

### Expected

The harness can seed company, minimum accounts/account_mappings, customer, supplier, item, warehouse, and opening stock prerequisites.

### Actual

No master-data schema/runtime is present in the active sandbox.

### Required remediation

Provide MD-01 baseline package or approved schema migrations. Do not ask INT-01 to invent tables outside accepted scope.

## INT01-P0-004 — Inventory integration surface unavailable

**Module:** EW-05 Inventory  
**Severity:** P0  
**Blocks final merge:** YES

### Reproduction steps

1. Run preflight for inventory source-of-truth table `inventory_ledger_entries` and cache table `stock_balances`.
2. No executable schema/runtime is available in active sandbox.
3. Attempting Sales/Purchase stock flows is impossible without inventory composition.

### Expected

Mergeable EW-05 inventory baseline supports opening stock, purchase receipt, sales delivery, sales/purchase update-stock, inventory adjustment, stock balance query, and reversal verification.

### Actual

Inventory cannot be verified because no executable inventory baseline is available.

### Required remediation

Provide mergeable EW-05 package with approved migrations and adapter/runtime surface.

## INT01-P0-005 — Cross-module runnable harness gap

**Module:** Cross-module Integration  
**Severity:** P0  
**Blocks final merge:** YES

### Reproduction steps

1. Attempt to call a unified command or service sequence for seed → purchase → sales → payment → adjustment → reports → cancel.
2. No adapter/API/CLI/runner exists in active sandbox.

### Expected

The harness can call accepted module surfaces in one transactionally coherent flow and produce deterministic evidence logs.

### Actual

Only the harness specification/report package can be produced; executable smoke cannot run.

### Required remediation

Supply a repository/bundle exposing adapters or authorize a strictly mechanical integration shell that wires accepted module APIs without changing business logic.

## Issues intentionally not opened

No issue is opened for business-rule mismatch, accounting invariant violation, or feature behavior because no executable flow was run in this workspace. Reporting such a failure as observed would be inaccurate.
