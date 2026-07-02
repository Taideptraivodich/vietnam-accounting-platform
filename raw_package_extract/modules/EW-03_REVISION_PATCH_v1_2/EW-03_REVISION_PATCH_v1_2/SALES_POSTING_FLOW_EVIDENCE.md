# SALES_POSTING_FLOW_EVIDENCE

## Pattern: `invoice_updates_stock`

Sales Invoice posting sequence inside one transaction:

```text
1. Load draft Sales Invoice + lines.
2. Resolve company/persisted stock pattern.
3. Call generic inventoryIssueService.postIssue for stock movement.
4. Compose balanced accounting lines:
   - Dr receivable, cash, or bank account
   - Cr revenue account(s) from invoice lines
   - Cr configured VAT output account when taxable
   - Dr cogs and Cr merchandise/finished/raw/tools inventory via inventory issue contract
5. Call EW-01 coreAccounting.postAccountingDocument(request, tx).
6. For credit sales, call EW-02 arLedger.createOutstanding(... journal_entry_id ...).
7. For taxable sales, call EW-06 taxLedger.writeVatOutput(... journal_entry_id ...).
8. Mark Sales Invoice posted.
```

Evidence in source:

```text
src/sales/services/SalesPostingService.js
  postSalesInvoice()
  _buildSalesInvoiceAccountingLines()
  assertCanonicalAccountingLines()
  assertBalanced()
```

## Pattern: `delivery_then_invoice`

Delivery Note posting sequence:

```text
1. Load draft Delivery Note + lines.
2. Resolve configured account subtype goods_sent_for_sale.
3. Call generic inventoryIssueService.postIssue with source_document_type = delivery_note.
4. Compose balanced accounting lines:
   - Dr goods sent for sale account
   - Cr merchandise/finished/raw/tools inventory account(s) returned by inventory issue contract
5. Call EW-01 coreAccounting.postAccountingDocument(request, tx).
6. Mark Delivery Note posted.
```

Sales Invoice posting after Delivery Note:

```text
1. Load draft Sales Invoice.
2. No inventoryIssueService call.
3. Compose receivable/cash/bank, revenue, VAT output accounting lines.
4. Call EW-01 postAccountingDocument.
5. Wire AR and VAT ledger events with returned journal_entry_id.
```

## Cash / Bank Sales

Cash Sales Invoice posting debits an explicit `payment_account_id` / `cash_account_id`, or resolves `cash` / `bank` subtype from `payment_method`. It does not create AR outstanding.

## VAT GL Evidence

The VAT output GL line is composed by Sales with a real account:

```text
account_id: await accountResolver.resolveVatOutputAccount(invoice.company_id, tx)
debit: 0
credit: invoice.tax_amount
memo: 'VAT output'
tax_direction: 'output'
```

The service rejects any accounting line without `account_id` before EW-01 is called.
