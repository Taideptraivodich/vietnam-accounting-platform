# SALES_PURCHASE_INTEGRATION_NOTES_EW06.md

## 1. Purpose

These notes define how EW-03 Sales and EW-04 Purchase should call EW-06 VAT tax ledger after EW-01 GL posting returns a journal result.

EW-06 does not wire into Sales/Purchase source modules by itself. Wiring should happen in EW-03/EW-04 after their source document and EW-01 posting contracts are stable.

## 2. Required sequence

For a posting transaction:

```text
1. Sales/Purchase validates source document and tax metadata.
2. Sales/Purchase resolves VAT account from company account mappings.
3. Sales/Purchase composes accounting lines, including VAT GL line.
4. Sales/Purchase calls EW-01 postAccountingDocument(request, tx).
5. EW-01 returns journal_entry_id / posting result.
6. Sales/Purchase calls EW-06 tax ledger writer with journal_entry_id.
7. The whole unit commits atomically.
```

EW-06 must not be called before EW-01 returns `journal_entry_id`.

## 3. Sales Invoice output VAT

Rule:

```text
Sales Invoice output tax → tax_direction=output
```

Sales owns:

```text
- output VAT GL composition
- VAT output account mapping, e.g. account subtype/config for VAT output
- ensuring no null VAT account_id in GL lines
- passing tax_account_id to EW-06
```

Example:

```js
const postingResult = await postAccountingDocument(salesPostingRequest, tx);

await taxLedgerService.writeTaxLedgerEntry({
  company_id: invoice.company_id,
  source_document_type: 'sales_invoice',
  source_document_id: invoice.id,
  source_document_line_id: line.id,
  posting_date: invoice.posting_date,
  invoice_no: invoice.invoice_no,
  invoice_date: invoice.invoice_date,
  party_type: 'customer',
  party_id: invoice.customer_id,
  tax_direction: 'output',
  tax_rate: line.tax_rate,
  taxable_amount: line.taxable_amount,
  tax_amount: line.tax_amount,
  tax_account_id: resolvedVatOutputAccountId,
  journal_entry_id: postingResult.journal_entry_id,
});
```

## 4. Purchase Invoice input VAT

Rule:

```text
Purchase Invoice input tax → tax_direction=input
```

Purchase owns:

```text
- input VAT GL composition
- VAT input account mapping, e.g. account subtype/config for VAT input
- ensuring no null VAT account_id in GL lines
- passing tax_account_id to EW-06
```

Example:

```js
const postingResult = await postAccountingDocument(purchasePostingRequest, tx);

await taxLedgerService.writeTaxLedgerEntry({
  company_id: invoice.company_id,
  source_document_type: 'purchase_invoice',
  source_document_id: invoice.id,
  source_document_line_id: line.id,
  posting_date: invoice.posting_date,
  invoice_no: invoice.invoice_no,
  invoice_date: invoice.invoice_date,
  party_type: 'supplier',
  party_id: invoice.supplier_id,
  tax_direction: 'input',
  tax_rate: line.tax_rate,
  taxable_amount: line.taxable_amount,
  tax_amount: line.tax_amount,
  tax_account_id: resolvedVatInputAccountId,
  journal_entry_id: postingResult.journal_entry_id,
});
```

## 5. Cancellation / reversal

For cancellation, Sales/Purchase should first call EW-01 reversal/cancellation posting and then call EW-06 reversal with the reversal `journal_entry_id`:

```js
const reversalPostingResult = await reverseAccountingDocument(reverseRequest, tx);

await taxLedgerService.reverseForSourceDocument({
  companyId: invoice.company_id,
  sourceDocumentType: 'sales_invoice', // or purchase_invoice
  sourceDocumentId: invoice.id,
  postingDate: cancellation.posting_date,
  journalEntryId: reversalPostingResult.journal_entry_id,
});
```

## 6. Explicit non-scope

```text
No official VAT return finalization in Worker v1.0.
No advanced VAT/valuation tax scope.
EW-06 does not decide VAT account mapping.
EW-06 does not write GL directly.
```
