// EW-02 — AR/AP Types (Architecture Freeze v1.0)

export type PartyType = 'customer' | 'supplier';

export type ArApEntryType =
  | 'invoice'
  | 'credit_note'
  | 'payment'
  | 'advance'
  | 'reversal';

export type VoucherStatus = 'draft' | 'posted' | 'cancelled';
export type AllocationStatus = 'active' | 'cancelled';
export type AllocationEventType = 'allocated' | 'cancelled' | 'reversed';
export type OutstandingStatus = 'open' | 'partial' | 'settled' | 'cancelled';

// ─── Ledger Entry ───────────────────────────────────────────

export interface ArApLedgerEntry {
  id: string;
  companyId: string;
  partyType: PartyType;
  partyId: string;
  entryType: ArApEntryType;
  debitAmount: number;
  creditAmount: number;
  currencyCode: string;
  sourceDocumentType: string;
  sourceDocumentId: string;
  sourceDocumentLineId?: string;
  postingDate: string;         // ISO date 'YYYY-MM-DD'
  accountingPeriod: string;    // 'YYYY-MM'
  reversesEntryId?: string;
  idempotencyKey: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateArApLedgerEntryInput {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  entryType: ArApEntryType;
  debitAmount: number;
  creditAmount: number;
  currencyCode?: string;
  sourceDocumentType: string;
  sourceDocumentId: string;
  sourceDocumentLineId?: string;
  postingDate: string;
  accountingPeriod: string;
  reversesEntryId?: string;
  idempotencyKey: string;
  notes?: string;
  createdBy: string;
}

// ─── Allocation ──────────────────────────────────────────────

export interface ArApAllocation {
  id: string;
  companyId: string;
  partyType: PartyType;
  partyId: string;
  invoiceLedgerEntryId: string;
  paymentLedgerEntryId: string;
  /**
   * Positive for original allocation events; negative for cancellation/reversal events.
   */
  allocatedAmount: number;
  currencyCode: string;
  allocationDate: string;
  allocationEventType: AllocationEventType;
  /** Derived API status. Original allocation rows become 'cancelled' only by virtue of an appended reversal event. */
  status: AllocationStatus;
  reversalOfAllocationId?: string;
  reversalReason?: string;
  idempotencyKey: string;
  createdAt: string;
  createdBy: string;
}

export interface AllocatePaymentInput {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  paymentLedgerEntryId: string;
  allocations: Array<{
    invoiceLedgerEntryId: string;
    allocatedAmount: number;
  }>;
  allocationDate: string;
  idempotencyKey: string;
  createdBy: string;
  /** Optional shared unit-of-work/transaction context. */
  tx?: AccountingTransactionContext;
}

export interface CancelAllocationInput {
  companyId: string;
  allocationId: string;
  cancelledBy: string;
  reason: string;
  /** Optional idempotency key for the appended cancellation event. */
  idempotencyKey?: string;
  /** Optional shared unit-of-work/transaction context. */
  tx?: AccountingTransactionContext;
}

// ─── Outstanding Cache ───────────────────────────────────────

export interface OutstandingCacheRow {
  id: string;
  companyId: string;
  partyType: PartyType;
  partyId: string;
  sourceDocumentType: string;
  sourceDocumentId: string;
  originalAmount: number;
  allocatedAmount: number;
  outstandingAmount: number;
  currencyCode: string;
  status: OutstandingStatus;
  arApLedgerEntryId: string;
  lastUpdatedAt: string;
}

// ─── Receipt Voucher ─────────────────────────────────────────

export interface ReceiptVoucher {
  id: string;
  companyId: string;
  voucherNumber: string;
  voucherDate: string;
  accountingPeriod: string;
  customerId: string;
  receivedAmount: number;
  currencyCode: string;
  debitAccountId: string;
  creditAccountId: string;
  status: VoucherStatus;
  glJournalEntryId?: string;
  arApLedgerEntryId?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateReceiptVoucherInput {
  companyId: string;
  voucherDate: string;
  customerId: string;
  receivedAmount: number;
  currencyCode?: string;
  debitAccountId: string;
  creditAccountId: string;
  notes?: string;
  createdBy: string;
  /** Optional transaction context for draft creation when caller already owns a unit of work. */
  tx?: AccountingTransactionContext;
}

export interface PostReceiptVoucherInput {
  companyId: string;
  receiptVoucherId: string;
  idempotencyKey: string;
  postedBy: string;
  /** Optional shared unit-of-work/transaction context for integrated posting. */
  tx?: AccountingTransactionContext;
}

export interface CancelReceiptVoucherInput {
  companyId: string;
  receiptVoucherId: string;
  cancelledBy: string;
  reason: string;
  /** Optional shared unit-of-work/transaction context for integrated posting. */
  tx?: AccountingTransactionContext;
}

// ─── Payment Voucher ─────────────────────────────────────────

export interface PaymentVoucher {
  id: string;
  companyId: string;
  voucherNumber: string;
  voucherDate: string;
  accountingPeriod: string;
  supplierId: string;
  paidAmount: number;
  currencyCode: string;
  debitAccountId: string;
  creditAccountId: string;
  status: VoucherStatus;
  glJournalEntryId?: string;
  arApLedgerEntryId?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface CreatePaymentVoucherInput {
  companyId: string;
  voucherDate: string;
  supplierId: string;
  paidAmount: number;
  currencyCode?: string;
  debitAccountId: string;
  creditAccountId: string;
  notes?: string;
  createdBy: string;
  /** Optional transaction context for draft creation when caller already owns a unit of work. */
  tx?: AccountingTransactionContext;
}

export interface PostPaymentVoucherInput {
  companyId: string;
  paymentVoucherId: string;
  idempotencyKey: string;
  postedBy: string;
  /** Optional shared unit-of-work/transaction context for integrated posting. */
  tx?: AccountingTransactionContext;
}

export interface CancelPaymentVoucherInput {
  companyId: string;
  paymentVoucherId: string;
  cancelledBy: string;
  reason: string;
  /** Optional shared unit-of-work/transaction context for integrated posting. */
  tx?: AccountingTransactionContext;
}

// ─── Query Params ────────────────────────────────────────────

export interface QueryOutstandingParams {
  companyId: string;
  partyType: PartyType;
  partyId: string;
  status?: OutstandingStatus;
}

export interface QueryLedgerParams {
  companyId: string;
  partyType?: PartyType;
  partyId?: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  fromDate?: string;
  toDate?: string;
}

// ─── EW-01 Posting Contract (called from this module, owned by EW-01) ────

/**
 * Transaction context/DB client supplied by the application service/unit-of-work.
 * EW-02 write paths must run in one transaction together with source document
 * updates and EW-01 GL posting/reversal.
 */
export interface AccountingQueryRunner {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export type AccountingTransactionContext = AccountingQueryRunner;

export interface AccountingTransactionManager {
  transaction<T>(fn: (tx: AccountingTransactionContext) => Promise<T>): Promise<T>;
}

export interface AccountingDocumentLine {
  accountId: string; // canonical EW-01 accounts.id value; payload field remains accountId/account_id
  debitAmount: number;
  creditAmount: number;
  description?: string;
  partyType?: PartyType;
  partyId?: string;
}

export interface PostAccountingDocumentRequest {
  companyId: string;
  postingDate: string;
  sourceDocumentType: string;
  sourceDocumentId: string;
  sourceDocumentNo?: string;
  accountingPeriod: string;
  idempotencyKey: string;
  lines: AccountingDocumentLine[];
  createdBy: string;
}

export interface ReverseAccountingDocumentRequest {
  companyId: string;
  journalEntryId: string;
  reversalDate?: string;
  sourceDocumentType: string;
  sourceDocumentId: string;
  reason: string;
  reversedBy: string;
  idempotencyKey: string;
}

export interface GlPostingResult {
  journalEntryId: string;
  status: 'posted';
}

// Backward-compatible aliases for older EW-02 call sites.
export type GlPostingRequest = PostAccountingDocumentRequest;
