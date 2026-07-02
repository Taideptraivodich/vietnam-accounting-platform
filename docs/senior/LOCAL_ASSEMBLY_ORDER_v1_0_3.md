# LOCAL_ASSEMBLY_ORDER_v1_0_3

Expected migration/module order for local candidate assembly:

1. EW-01 Core Accounting / GL Foundation
2. EW-06 VAT Ledger Baseline
3. EW-02 v1.3 AR/AP Ledger + Allocation
4. MD-01 Master Data Baseline migration
5. EW-05 v1.1 Inventory Moving Average Baseline
6. EW-03 Sales / Delivery Baseline
7. EW-04 Purchase / GRNI Baseline
8. MD-01 seed
9. INT-01 cross-module smoke test

Notes:

- Keep source documents separate from posting.
- Core Accounting remains the only GL writer.
- GL and ledgers remain append-only.
- Posted documents remain immutable; cancellation uses reversal.
- Company context is mandatory.
