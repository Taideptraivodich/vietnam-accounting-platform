# Expected local evidence

The local run should produce evidence under `reports/int01a`.

Expected minimum evidence after applying this patch:

```text
npm run seed:md01: PASS
node --check src/int01a/int01a-approved-surface-adapter.mjs: PASS
node --check src/int01a/int01b-post-sales-delivery-wiring.mjs: PASS
node scripts/int01b-verify-adapter-load.mjs: PASS
npm run int01a:smoke: progresses beyond INT01A-05 or reports the next real blocker
```

The prior INT01A-05 dependency-resolution errors should be eliminated:

```text
transactionManager undefined: eliminated by PgTransactionManager
salesInvoiceRepository undefined: eliminated by PostgresSalesInvoiceRepository
deliveryNoteRepository undefined: eliminated by PostgresDeliveryNoteRepository
```

Expected report files:

```text
reports/int01a/*.json
reports/int01a/*.md
```

If a later module surface fails, preserve the JSON/Markdown report and escalate that next blocker with the first failing INT01A step and exact error.
