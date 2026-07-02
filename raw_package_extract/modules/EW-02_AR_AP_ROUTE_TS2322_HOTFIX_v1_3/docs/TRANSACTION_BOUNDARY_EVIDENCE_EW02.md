# EW-02 Transaction Boundary Evidence

## Requirement

Senior Round 2 requires:

```text
source document + GL + AR/AP + allocation/cache = one Unit of Work, one commit
```

## Implementation

EW-02 now exposes and consumes:

```ts
export interface AccountingQueryRunner {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export type AccountingTransactionContext = AccountingQueryRunner;

export interface AccountingTransactionManager {
  transaction<T>(fn: (tx: AccountingTransactionContext) => Promise<T>): Promise<T>;
}
```

Service write paths use:

```ts
private async withUnitOfWork<T>(
  tx: AccountingTransactionContext | undefined,
  work: (tx: AccountingTransactionContext) => Promise<T>,
): Promise<T>
```

Behavior:

1. If caller supplies `tx`, all GL + AR/AP operations use that transaction.
2. If caller does not supply `tx`, EW-02 opens one through `AccountingTransactionManager`.
3. If neither exists, the write operation fails fast.

## Methods covered

- `postReceiptVoucher`
- `cancelReceiptVoucher`
- `postPaymentVoucher`
- `cancelPaymentVoucher`
- `allocatePayment`
- `cancelAllocation`
- `writeInvoiceLedgerEntry`

Draft creation repository methods also accept `tx` for callers that create source documents inside a broader unit of work.

## Repository write signatures

```ts
ledgerRepo.insertEntry(input, tx)
allocationRepo.insert(..., tx)
allocationRepo.cancel(input, tx)
outstandingRepo.upsert(..., tx)
outstandingRepo.markCancelled(..., tx)
receiptVoucherRepo.markPosted(..., tx)
receiptVoucherRepo.markCancelled(..., tx)
paymentVoucherRepo.markPosted(..., tx)
paymentVoucherRepo.markCancelled(..., tx)
```

Read methods used for validation inside write flows also accept `tx`, preventing read/write split-brain inside posting/cancellation.
