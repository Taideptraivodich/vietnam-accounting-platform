# Transaction Boundary Contract v1.0 — EW-01

## 1. Non-negotiable rule

For one business document, all posting side effects must commit atomically:

```text
Business source document
+ subledger event
+ inventory ledger event, when any
+ tax ledger event, when any
+ journal_entries / gl_entries
= one Unit of Work, one commit
```

## 2. Owner of transaction

The **business module application service** opens the transaction.

Core Accounting does not open or commit a transaction when called through the shared contract:

```js
postAccountingDocument(request, tx)
reverseAccountingDocument(request, tx)
```

Both methods require `tx` and throw if it is missing.

## 3. Implementation pattern

```js
const { withTransaction } = require('../core-accounting/src/utils/UnitOfWork');

async function postSalesInvoice(command) {
  return withTransaction(db, async (tx) => {
    const invoice = await salesInvoiceRepository.insert(command.invoice, tx);

    const inventoryEvents = await inventoryService.writeLedgerIfNeeded(invoice, tx);

    const accountingResult = await postingService.postAccountingDocument({
      company_id: invoice.company_id,
      posting_date: invoice.posting_date,
      source_document_type: 'SALES_INVOICE',
      source_document_id: invoice.id,
      source_document_no: invoice.invoice_no,
      idempotency_key: `SALES_INVOICE:${invoice.id}:post:v1`,
      lines: buildSalesInvoiceGlLines(invoice, inventoryEvents),
      tax_metadata: { tax_event_scope: 'SALES_OUTPUT' }
    }, tx);

    await taxLedgerService.writeOutputVatFromPosting(invoice, accountingResult, tx);
    await arLedgerService.writeInvoiceEvent(invoice, accountingResult, tx);

    return { invoice, accountingResult };
  });
}
```

## 4. Forbidden pattern

Do not do this:

```js
await salesRepository.insert(invoice);              // transaction A or autocommit
await postingService.postAccountingDocument(...);   // transaction B
await taxLedgerService.write(...);                  // transaction C
```

This breaks atomicity and can leave source documents without GL, GL without tax ledger, or inventory ledger without accounting links.

## 5. Core Accounting standalone wrappers

EW-01 includes standalone wrappers only for manual/admin flows:

```js
postAccountingDocumentStandalone(request)
reverseAccountingDocumentStandalone(request)
```

Other EW modules should not call those wrappers because they open their own transaction and cannot include the module's source/subledger writes.

## 6. Test evidence

`tests/run_unit_tests.js` verifies:

- `postAccountingDocument(request)` without `tx` throws.
- `postAccountingDocument(request, tx)` does not execute `BEGIN` or `COMMIT`.
- `withTransaction(db, async tx => ...)` executes exactly one `BEGIN` and one `COMMIT` around source + GL work.
