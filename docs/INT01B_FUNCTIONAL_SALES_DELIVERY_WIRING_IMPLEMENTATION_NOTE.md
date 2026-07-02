# INT-01B Functional Sales/Delivery Wiring P0 v1.1

## Scope

This package resolves the INT01A-05 blocker by replacing the unbound/example INT-01A Sales/Delivery adapter with a real functional wiring layer for `postSalesDelivery`.

The bridge constructs and injects the dependencies that the approved EW-03 Sales/Delivery service surface requires:

- `transactionManager`
- `salesInvoiceRepository`
- `deliveryNoteRepository`
- `companySettingsRepository`
- `accountResolver`
- `coreAccounting`
- `inventoryIssueService`
- `arLedger`
- `taxLedger`

The smoke adapter remains thin: it maps INT-01A context into the bridge, invokes the approved surface, and normalizes the response.

## Files patched

```text
src/int01a/int01a-approved-surface-adapter.mjs
src/int01a/int01b-post-sales-delivery-wiring.mjs
scripts/int01b-verify-adapter-load.mjs
```

## Design

`src/int01a/int01a-approved-surface-adapter.mjs` exports all required INT-01A adapter functions so INT01A-04 remains green. Only `postSalesDelivery` is implemented in this P0 v1.1 patch. Other surfaces fail closed with explicit next-blocker errors unless the local candidate provides them separately.

`src/int01a/int01b-post-sales-delivery-wiring.mjs` does the real wiring:

1. Resolves MD01 company/customer/item/warehouse/account IDs from the INT-01A context or environment.
2. Creates DB-backed Sales/Delivery repositories.
3. Constructs the real EW-03 `SalesPostingService` with required dependencies.
4. Creates Sales/Delivery draft source documents through the Sales/Delivery service when possible, otherwise through the DB-backed Sales/Delivery repository layer.
5. Invokes the real `SalesPostingService` posting method.
6. Delegates GL posting to EW-01 `coreAccounting.postAccountingDocument`; this patch does not insert GL rows.

## Explicit non-goals

- No production merge instruction is included.
- No smoke-runner fake-pass logic is added.
- No GL rows are inserted by the INT-01A smoke adapter or by this patch.
- Sales/Delivery posting logic is not reimplemented inside the adapter.
- Architecture Freeze v1.0 is not changed.
- P1/P2 scope remains closed.

## Important sandbox limitation

The uploaded artifact for this task contained blocker/dispatch documents only. It did not contain the runnable local candidate source tree or a PostgreSQL database. Therefore this package is a patch overlay for the assembled local candidate. Syntax/load checks can be run on the overlay; the full `npm run seed:md01` and `npm run int01a:smoke` evidence must be produced on the local candidate with Docker/PostgreSQL.
