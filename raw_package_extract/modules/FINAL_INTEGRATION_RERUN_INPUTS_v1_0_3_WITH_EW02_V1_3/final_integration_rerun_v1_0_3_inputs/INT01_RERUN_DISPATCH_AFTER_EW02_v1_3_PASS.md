# INT-01 Rerun Dispatch — Final Integration Gate v1.0.3

## Trigger

EW-02 AR/AP route-boundary TS2322 blocker has been fixed and Senior accepted v1.3.

## Required Action

Rerun Final Integration Gate as:

```text
Final Integration Gate v1.0.3
```

Use bundle:

```text
FINAL_INTEGRATION_RERUN_INPUTS_v1_0_3_WITH_EW02_V1_3.zip
```

## Required Environment

```text
DATABASE_URL is mandatory.
Disposable PostgreSQL database required.
MD-01 seed must run.
```

## Assembly Order

```text
1. EW-01 Core Accounting / GL
2. EW-06 VAT Ledger
3. EW-02 AR/AP v1.3
4. MD-01 Master Data
5. EW-05 Inventory v1.1
6. EW-03 Sales / Delivery
7. EW-04 Purchase / GRNI
8. Unified integration harness
9. Cross-module smoke test
```

## Production Merge Rule

```text
Do not merge production unless Final Integration Gate v1.0.3 fully passes.
```
