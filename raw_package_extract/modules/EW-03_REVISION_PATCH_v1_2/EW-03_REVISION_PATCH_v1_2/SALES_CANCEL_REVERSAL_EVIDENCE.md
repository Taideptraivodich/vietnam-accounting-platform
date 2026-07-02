# SALES_CANCEL_REVERSAL_EVIDENCE

## Sales Invoice Cancellation

Cancellation sequence inside one transaction:

```text
1. Load posted Sales Invoice + lines.
2. Check active allocation through EW-02 arLedger.hasActiveAllocation.
3. If active allocation exists, block cancellation.
4. Call EW-01 coreAccounting.reverseAccountingDocument.
5. If stock pattern was invoice_updates_stock, call inventoryIssueService.reverseIssue.
6. If credit sale, call arLedger.reverseOutstanding.
7. If taxable, call taxLedger.reverseVatOutput.
8. Mark Sales Invoice cancelled with reversal journal reference.
```

Ledger rows remain append-only. EW-03 does not update or delete shared ledger rows.

## Delivery Note Cancellation

Cancellation sequence inside one transaction:

```text
1. Load posted Delivery Note.
2. Block if a linked Sales Invoice is already posted.
3. Call EW-01 coreAccounting.reverseAccountingDocument.
4. Call generic inventoryIssueService.reverseIssue.
5. Mark Delivery Note cancelled with reversal journal reference.
```

## Dependency Rules Preserved

```text
Sales Invoice cancel is blocked by active payment allocation.
Delivery Note cancel is blocked by posted linked Sales Invoice.
GL reversal is delegated to EW-01.
Inventory reversal is delegated to EW-05 generic issue reversal.
VAT reversal is delegated to EW-06 tax ledger reversal after GL reversal result.
```
