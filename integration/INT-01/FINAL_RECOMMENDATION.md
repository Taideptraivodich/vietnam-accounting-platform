# FINAL_RECOMMENDATION

**Worker:** INT-01  
**Sprint:** P0 Remediation Sprint  
**Generated at:** 2026-06-27T09:44:37Z  
**Final recommendation:** `BLOCK FINAL MERGE`

## Decision

Do not merge production.

The Unified Integration Harness specification has been created, and the required smoke coverage is mapped across GL, VAT, AR/AP, Inventory, Sales/Delivery, Purchase/GRNI, and Master Data. However, the current workspace does not contain the executable baseline required to run the harness.

## Basis

- INT-01 was restricted to harness/integration work only.
- No business module changes were made.
- The Accounting Engine was not changed.
- No production merge was attempted.
- No feature was added.
- The active sandbox lacks executable EW/MD packages, migrations, runtime manifest, and adapter/API/CLI surfaces.

## Required before re-run

Provide a complete executable integration package or repository checkout containing:

```text
EW-01 Core Accounting / GL
EW-06 VAT Ledger
EW-02 AR/AP
EW-05 Mergeable Inventory Implementation
EW-03 Sales / Delivery
EW-04 Purchase / GRNI
MD-01 Master Data Baseline
ordered migrations
runtime/test command surface
module adapters or callable service/API/CLI entrypoints
evidence log destination
```

## Re-run command expectation

Once inputs are supplied, the harness should run the following logical sequence:

```text
preflight -> migrate -> seed -> smoke -> invariants -> cancel/reversal -> reports
```

Final merge can only be recommended after all smoke cases pass and all non-negotiable invariants are verified:

```text
GL debit = credit
GL append-only
AR/AP ledger append-only
AR/AP allocations append-only/cancellation-event pattern
tax_ledger_entries append-only
inventory_ledger_entries append-only
stock_balances cache-only and rebuildable
company isolation
no P1/P2 scope expansion
```

## Recommendation status

`BLOCKED_BY_P0_INPUT_PRECONDITION`

This should be escalated to Senior Final Merge Gate as a blocked remediation result, not as a passed integration gate.
