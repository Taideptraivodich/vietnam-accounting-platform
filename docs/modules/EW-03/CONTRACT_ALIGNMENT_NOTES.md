# CONTRACT_ALIGNMENT_NOTES_EW03

## 1. Canonical Accounts Contract

EW-03 uses canonical account references only:

```text
Physical PK: accounts.id
Payload field: account_id = accounts.id
```

Sales-owned fields that store account references:

```text
account_id
payment_account_id
cash_account_id
revenue_account_id
vat_output_account_id
goods_sent_for_sale_account_id
```

The migration references `accounts(id)`. The Sales module does not create or own the shared accounts table.

## 2. Frozen Account Subtypes Used by EW-03

Account settings are resolved through `AccountContractResolver`, which expects an injected repository to resolve company mappings by frozen COA-compatible subtype:

```text
receivable
cash
bank
sales_revenue
vat_output
goods_sent_for_sale
cogs
merchandise_inventory
finished_goods
raw_material
tools
```

Cash-sale debit account resolution follows this order:

```text
1. explicit payment_account_id / cash_account_id, whose value is accounts.id
2. payment_method mapped to cash or bank subtype
```

## 3. EW-01 Core Accounting Contract

EW-03 does not insert GL rows. It composes accounting lines and delegates write/reversal to Core Accounting:

```text
coreAccounting.postAccountingDocument(request, tx)
coreAccounting.reverseAccountingDocument(request, tx)
```

Required request fields used by EW-03:

```text
company_id
posting_date
source_document_type
source_document_id
source_document_no
idempotency_key
party_id
lines[]
```

Each accounting line must have a non-null `account_id`. The service rejects legacy account fields and VAT placeholder lines before calling EW-01.

## 4. VAT Output GL Responsibility

Accepted merge-gate rule applied:

```text
Sales composes VAT output GL line.
EW-06 writes tax_ledger_entries only.
```

Sales Invoice posting resolves the configured `vat_output` account and creates the GL line:

```text
Cr VAT output account_id = configured vat_output account
```

After EW-01 posts GL, EW-03 calls EW-06 tax ledger with the returned `journal_entry_id`.

## 5. Company Sales Pattern Setting

Supported values:

```text
invoice_updates_stock
delivery_then_invoice
```

Draft invoice creation reads `companies.sales_stock_pattern` through `companySettingsRepository.getSalesStockPattern(company_id, tx)`. The selected pattern is stored on the invoice so future company setting changes do not mutate posted-document behavior.

## 6. Delivery Note / Inventory Boundary

Delivery Note is the Sales-owned source document. Stock movement is delegated to a generic Inventory issue contract:

```text
inventoryIssueService.postIssue(request, tx)
inventoryIssueService.reverseIssue(request, tx)
```

EW-03 does not implement a duplicate sales-specific inventory flow.

## 7. Goods Sent for Sale Mapping

Delivery Note posting uses account subtype:

```text
goods_sent_for_sale
```

The TT99 candidate account is TK 157, but the code only uses configured `account_id`. Account-code mapping remains configuration / EW-01 account setup responsibility.
