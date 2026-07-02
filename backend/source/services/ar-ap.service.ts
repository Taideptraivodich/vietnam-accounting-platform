// EW-02 — AR/AP Service
// Implements: Receipt Voucher, Payment Voucher, allocation, outstanding, cancellation.
// Core Accounting (EW-01) is the only GL writer — this service calls the GL posting contract.

import {
  CreateReceiptVoucherInput,
  PostReceiptVoucherInput,
  CancelReceiptVoucherInput,
  CreatePaymentVoucherInput,
  PostPaymentVoucherInput,
  CancelPaymentVoucherInput,
  AllocatePaymentInput,
  CancelAllocationInput,
  QueryOutstandingParams,
  QueryLedgerParams,
  ReceiptVoucher,
  PaymentVoucher,
  ArApAllocation,
  ArApLedgerEntry,
  OutstandingCacheRow,
  GlPostingRequest,
  GlPostingResult,
  AccountingTransactionContext,
  AccountingTransactionManager,
  ReverseAccountingDocumentRequest,
} from '../types/ar-ap.types';

import { ArApLedgerRepository } from '../repositories/ar-ap-ledger.repository';
import { ArApAllocationRepository } from '../repositories/ar-ap-allocation.repository';
import { OutstandingCacheRepository } from '../repositories/outstanding-cache.repository';

export interface IGlPostingService {
  /** EW-01 canonical GL posting contract. Business modules compose lines; EW-01 writes GL. */
  postAccountingDocument(
    request: GlPostingRequest,
    tx?: AccountingTransactionContext,
  ): Promise<GlPostingResult>;

  /** EW-01 canonical reversal contract. EW-02 never inserts or updates GL entry rows directly. */
  reverseAccountingDocument(
    request: ReverseAccountingDocumentRequest,
    tx?: AccountingTransactionContext,
  ): Promise<GlPostingResult>;
}

export interface IReceiptVoucherRepository {
  insert(
    input: CreateReceiptVoucherInput & { voucherNumber: string; accountingPeriod: string },
    tx?: AccountingTransactionContext,
  ): Promise<ReceiptVoucher>;
  findById(companyId: string, id: string, tx?: AccountingTransactionContext): Promise<ReceiptVoucher | null>;
  markPosted(
    id: string,
    glJournalEntryId: string,
    arApLedgerEntryId: string,
    tx?: AccountingTransactionContext,
  ): Promise<ReceiptVoucher>;
  markCancelled(id: string, cancelledBy: string, tx?: AccountingTransactionContext): Promise<ReceiptVoucher>;
}

export interface IPaymentVoucherRepository {
  insert(
    input: CreatePaymentVoucherInput & { voucherNumber: string; accountingPeriod: string },
    tx?: AccountingTransactionContext,
  ): Promise<PaymentVoucher>;
  findById(companyId: string, id: string, tx?: AccountingTransactionContext): Promise<PaymentVoucher | null>;
  markPosted(
    id: string,
    glJournalEntryId: string,
    arApLedgerEntryId: string,
    tx?: AccountingTransactionContext,
  ): Promise<PaymentVoucher>;
  markCancelled(id: string, cancelledBy: string, tx?: AccountingTransactionContext): Promise<PaymentVoucher>;
}

export interface IVoucherNumberService {
  next(companyId: string, type: 'receipt' | 'payment'): Promise<string>;
}

function accountingPeriod(date: string): string {
  return date.substring(0, 7);
}

export class ArApService {
  constructor(
    private readonly ledgerRepo: ArApLedgerRepository,
    private readonly allocationRepo: ArApAllocationRepository,
    private readonly outstandingRepo: OutstandingCacheRepository,
    private readonly receiptVoucherRepo: IReceiptVoucherRepository,
    private readonly paymentVoucherRepo: IPaymentVoucherRepository,
    private readonly glPostingService: IGlPostingService,
    private readonly voucherNumberService: IVoucherNumberService,
    /**
     * Required for standalone EW-02 write calls. Integrated Sales/Purchase flows
     * may instead supply their own tx so GL + AR/AP + source document commit together.
     */
    private readonly transactionManager?: AccountingTransactionManager,
  ) {}

  private async withUnitOfWork<T>(
    tx: AccountingTransactionContext | undefined,
    work: (tx: AccountingTransactionContext) => Promise<T>,
  ): Promise<T> {
    if (tx) return work(tx);
    if (!this.transactionManager) {
      throw new Error(
        'EW-02 write operation requires a transaction context or an AccountingTransactionManager. ' +
        'Source document, EW-01 GL and AR/AP side effects must commit in one unit of work.',
      );
    }
    return this.transactionManager.transaction(work);
  }

  // ════════════════════════════════════════════════════════════
  // RECEIPT VOUCHER (AR)
  // ════════════════════════════════════════════════════════════

  async createReceiptVoucher(input: CreateReceiptVoucherInput): Promise<ReceiptVoucher> {
    const voucherNumber = await this.voucherNumberService.next(input.companyId, 'receipt');
    const payload = {
      ...input,
      voucherNumber,
      accountingPeriod: accountingPeriod(input.voucherDate),
    };
    return input.tx
      ? this.receiptVoucherRepo.insert(payload, input.tx)
      : this.receiptVoucherRepo.insert(payload);
  }

  async postReceiptVoucher(input: PostReceiptVoucherInput): Promise<ReceiptVoucher> {
    return this.withUnitOfWork(input.tx, async (tx) => {
      const voucher = await this.receiptVoucherRepo.findById(input.companyId, input.receiptVoucherId, tx);
      if (!voucher) throw new Error(`Receipt Voucher ${input.receiptVoucherId} not found.`);
      if (voucher.status !== 'draft') throw new Error(`Receipt Voucher ${input.receiptVoucherId} is not in draft status.`);

      const glRequest: GlPostingRequest = {
        companyId: input.companyId,
        sourceDocumentType: 'receipt_voucher',
        sourceDocumentId: voucher.id,
        postingDate: voucher.voucherDate,
        accountingPeriod: voucher.accountingPeriod,
        idempotencyKey: input.idempotencyKey,
        lines: [
          { accountId: voucher.debitAccountId, debitAmount: voucher.receivedAmount, creditAmount: 0, description: `Receipt Voucher ${voucher.voucherNumber}` },
          { accountId: voucher.creditAccountId, debitAmount: 0, creditAmount: voucher.receivedAmount, description: `Receipt Voucher ${voucher.voucherNumber}`, partyType: 'customer', partyId: voucher.customerId },
        ],
        createdBy: input.postedBy,
      };
      const glResult = await this.glPostingService.postAccountingDocument(glRequest, tx);

      const ledgerEntry = await this.ledgerRepo.insertEntry({
        companyId: input.companyId,
        partyType: 'customer',
        partyId: voucher.customerId,
        entryType: 'payment',
        debitAmount: 0,
        creditAmount: voucher.receivedAmount,
        currencyCode: voucher.currencyCode,
        sourceDocumentType: 'receipt_voucher',
        sourceDocumentId: voucher.id,
        postingDate: voucher.voucherDate,
        accountingPeriod: voucher.accountingPeriod,
        idempotencyKey: `${input.idempotencyKey}:ar_entry`,
        createdBy: input.postedBy,
      }, tx);

      return this.receiptVoucherRepo.markPosted(voucher.id, glResult.journalEntryId, ledgerEntry.id, tx);
    });
  }

  async cancelReceiptVoucher(input: CancelReceiptVoucherInput): Promise<ReceiptVoucher> {
    return this.withUnitOfWork(input.tx, async (tx) => {
      const voucher = await this.receiptVoucherRepo.findById(input.companyId, input.receiptVoucherId, tx);
      if (!voucher) throw new Error(`Receipt Voucher ${input.receiptVoucherId} not found.`);
      if (voucher.status !== 'posted') throw new Error(`Only posted Receipt Vouchers can be cancelled.`);

      if (voucher.arApLedgerEntryId) {
        const activeAllocations = await this.allocationRepo.findActiveByPaymentEntry(
          input.companyId, voucher.arApLedgerEntryId, tx,
        );
        if (activeAllocations.length > 0) {
          throw new Error(
            `Receipt Voucher ${input.receiptVoucherId} has ${activeAllocations.length} active allocation(s). Cancel allocations first.`,
          );
        }
      }

      if (voucher.glJournalEntryId) {
        await this.glPostingService.reverseAccountingDocument({
          companyId: input.companyId,
          journalEntryId: voucher.glJournalEntryId,
          reversalDate: voucher.voucherDate,
          sourceDocumentType: 'receipt_voucher',
          sourceDocumentId: voucher.id,
          reason: input.reason,
          reversedBy: input.cancelledBy,
          idempotencyKey: `cancel:receipt_voucher:${voucher.id}:gl`,
        }, tx);
      }

      if (voucher.arApLedgerEntryId) {
        await this.ledgerRepo.insertEntry({
          companyId: input.companyId,
          partyType: 'customer',
          partyId: voucher.customerId,
          entryType: 'reversal',
          debitAmount: voucher.receivedAmount,
          creditAmount: 0,
          currencyCode: voucher.currencyCode,
          sourceDocumentType: 'receipt_voucher',
          sourceDocumentId: voucher.id,
          postingDate: voucher.voucherDate,
          accountingPeriod: voucher.accountingPeriod,
          reversesEntryId: voucher.arApLedgerEntryId,
          idempotencyKey: `cancel:receipt_voucher:${voucher.id}`,
          notes: input.reason,
          createdBy: input.cancelledBy,
        }, tx);
      }

      return this.receiptVoucherRepo.markCancelled(voucher.id, input.cancelledBy, tx);
    });
  }

  // ════════════════════════════════════════════════════════════
  // PAYMENT VOUCHER (AP)
  // ════════════════════════════════════════════════════════════

  async createPaymentVoucher(input: CreatePaymentVoucherInput): Promise<PaymentVoucher> {
    const voucherNumber = await this.voucherNumberService.next(input.companyId, 'payment');
    const payload = {
      ...input,
      voucherNumber,
      accountingPeriod: accountingPeriod(input.voucherDate),
    };
    return input.tx
      ? this.paymentVoucherRepo.insert(payload, input.tx)
      : this.paymentVoucherRepo.insert(payload);
  }

  async postPaymentVoucher(input: PostPaymentVoucherInput): Promise<PaymentVoucher> {
    return this.withUnitOfWork(input.tx, async (tx) => {
      const voucher = await this.paymentVoucherRepo.findById(input.companyId, input.paymentVoucherId, tx);
      if (!voucher) throw new Error(`Payment Voucher ${input.paymentVoucherId} not found.`);
      if (voucher.status !== 'draft') throw new Error(`Payment Voucher ${input.paymentVoucherId} is not in draft status.`);

      const glRequest: GlPostingRequest = {
        companyId: input.companyId,
        sourceDocumentType: 'payment_voucher',
        sourceDocumentId: voucher.id,
        postingDate: voucher.voucherDate,
        accountingPeriod: voucher.accountingPeriod,
        idempotencyKey: input.idempotencyKey,
        lines: [
          { accountId: voucher.debitAccountId, debitAmount: voucher.paidAmount, creditAmount: 0, description: `Payment Voucher ${voucher.voucherNumber}`, partyType: 'supplier', partyId: voucher.supplierId },
          { accountId: voucher.creditAccountId, debitAmount: 0, creditAmount: voucher.paidAmount, description: `Payment Voucher ${voucher.voucherNumber}` },
        ],
        createdBy: input.postedBy,
      };
      const glResult = await this.glPostingService.postAccountingDocument(glRequest, tx);

      const ledgerEntry = await this.ledgerRepo.insertEntry({
        companyId: input.companyId,
        partyType: 'supplier',
        partyId: voucher.supplierId,
        entryType: 'payment',
        debitAmount: voucher.paidAmount,
        creditAmount: 0,
        currencyCode: voucher.currencyCode,
        sourceDocumentType: 'payment_voucher',
        sourceDocumentId: voucher.id,
        postingDate: voucher.voucherDate,
        accountingPeriod: voucher.accountingPeriod,
        idempotencyKey: `${input.idempotencyKey}:ap_entry`,
        createdBy: input.postedBy,
      }, tx);

      return this.paymentVoucherRepo.markPosted(voucher.id, glResult.journalEntryId, ledgerEntry.id, tx);
    });
  }

  async cancelPaymentVoucher(input: CancelPaymentVoucherInput): Promise<PaymentVoucher> {
    return this.withUnitOfWork(input.tx, async (tx) => {
      const voucher = await this.paymentVoucherRepo.findById(input.companyId, input.paymentVoucherId, tx);
      if (!voucher) throw new Error(`Payment Voucher ${input.paymentVoucherId} not found.`);
      if (voucher.status !== 'posted') throw new Error(`Only posted Payment Vouchers can be cancelled.`);

      if (voucher.arApLedgerEntryId) {
        const activeAllocations = await this.allocationRepo.findActiveByPaymentEntry(
          input.companyId, voucher.arApLedgerEntryId, tx,
        );
        if (activeAllocations.length > 0) {
          throw new Error(
            `Payment Voucher ${input.paymentVoucherId} has ${activeAllocations.length} active allocation(s). Cancel allocations first.`,
          );
        }
      }

      if (voucher.glJournalEntryId) {
        await this.glPostingService.reverseAccountingDocument({
          companyId: input.companyId,
          journalEntryId: voucher.glJournalEntryId,
          reversalDate: voucher.voucherDate,
          sourceDocumentType: 'payment_voucher',
          sourceDocumentId: voucher.id,
          reason: input.reason,
          reversedBy: input.cancelledBy,
          idempotencyKey: `cancel:payment_voucher:${voucher.id}:gl`,
        }, tx);
      }

      if (voucher.arApLedgerEntryId) {
        await this.ledgerRepo.insertEntry({
          companyId: input.companyId,
          partyType: 'supplier',
          partyId: voucher.supplierId,
          entryType: 'reversal',
          debitAmount: 0,
          creditAmount: voucher.paidAmount,
          currencyCode: voucher.currencyCode,
          sourceDocumentType: 'payment_voucher',
          sourceDocumentId: voucher.id,
          postingDate: voucher.voucherDate,
          accountingPeriod: voucher.accountingPeriod,
          reversesEntryId: voucher.arApLedgerEntryId,
          idempotencyKey: `cancel:payment_voucher:${voucher.id}`,
          notes: input.reason,
          createdBy: input.cancelledBy,
        }, tx);
      }

      return this.paymentVoucherRepo.markCancelled(voucher.id, input.cancelledBy, tx);
    });
  }

  // ════════════════════════════════════════════════════════════
  // ALLOCATION
  // Settles one payment against one or many invoices.
  // No GL entry required when settling advance against invoice on same account.
  // ════════════════════════════════════════════════════════════

  async allocatePayment(input: AllocatePaymentInput): Promise<ArApAllocation[]> {
    return this.withUnitOfWork(input.tx, async (tx) => {
      const paymentEntry = await this.ledgerRepo.findById(input.companyId, input.paymentLedgerEntryId, tx);
      if (!paymentEntry) throw new Error(`Payment ledger entry ${input.paymentLedgerEntryId} not found.`);
      if (paymentEntry.companyId !== input.companyId) throw new Error('Cross-company allocation is not allowed.');
      if (paymentEntry.partyId !== input.partyId) throw new Error('Party mismatch on payment ledger entry.');

      const alreadyAllocated = await this.allocationRepo.sumAllocatedForPaymentEntry(
        input.companyId, input.paymentLedgerEntryId, tx,
      );
      const paymentAvailable = paymentEntry.creditAmount + paymentEntry.debitAmount - alreadyAllocated;

      const totalNewAllocation = input.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
      if (totalNewAllocation > paymentAvailable + 0.0001) {
        throw new Error(
          `Over-allocation blocked. Payment available: ${paymentAvailable}, requested: ${totalNewAllocation}.`,
        );
      }

      const results: ArApAllocation[] = [];

      for (let i = 0; i < input.allocations.length; i++) {
        const alloc = input.allocations[i];

        const invoiceEntry = await this.ledgerRepo.findById(input.companyId, alloc.invoiceLedgerEntryId, tx);
        if (!invoiceEntry) throw new Error(`Invoice ledger entry ${alloc.invoiceLedgerEntryId} not found.`);
        if (invoiceEntry.companyId !== input.companyId) throw new Error('Cross-company allocation is not allowed.');
        if (invoiceEntry.partyId !== input.partyId) throw new Error('Party mismatch on invoice ledger entry.');

        const invoiceAllocated = await this.allocationRepo.sumAllocatedForInvoiceEntry(
          input.companyId, alloc.invoiceLedgerEntryId, tx,
        );
        const invoiceAmount = invoiceEntry.debitAmount + invoiceEntry.creditAmount;
        const invoiceOutstanding = invoiceAmount - invoiceAllocated;

        if (alloc.allocatedAmount > invoiceOutstanding + 0.0001) {
          throw new Error(
            `Over-allocation blocked for invoice entry ${alloc.invoiceLedgerEntryId}. Outstanding: ${invoiceOutstanding}, requested: ${alloc.allocatedAmount}.`,
          );
        }

        const allocation = await this.allocationRepo.insert(
          input.companyId,
          input.partyType,
          input.partyId,
          alloc.invoiceLedgerEntryId,
          input.paymentLedgerEntryId,
          alloc.allocatedAmount,
          paymentEntry.currencyCode,
          input.allocationDate,
          `${input.idempotencyKey}:alloc:${i}`,
          input.createdBy,
          tx,
        );

        results.push(allocation);

        const newInvoiceAllocated = invoiceAllocated + alloc.allocatedAmount;
        await this.outstandingRepo.upsert(
          input.companyId, input.partyType, input.partyId,
          invoiceEntry.sourceDocumentType, invoiceEntry.sourceDocumentId,
          invoiceAmount, newInvoiceAllocated, paymentEntry.currencyCode,
          invoiceEntry.id,
          tx,
        );
      }

      return results;
    });
  }

  async cancelAllocation(input: CancelAllocationInput): Promise<ArApAllocation> {
    return this.withUnitOfWork(input.tx, async (tx) => {
      const allocation = await this.allocationRepo.findById(input.companyId, input.allocationId, tx);
      if (!allocation) throw new Error(`Allocation ${input.allocationId} not found.`);
      if (allocation.status !== 'active') throw new Error(`Allocation ${input.allocationId} is already cancelled.`);

      const cancelled = await this.allocationRepo.cancel(input, tx);

      const invoiceEntry = await this.ledgerRepo.findById(input.companyId, allocation.invoiceLedgerEntryId, tx);
      if (invoiceEntry) {
        const newAllocated = await this.allocationRepo.sumAllocatedForInvoiceEntry(
          input.companyId, allocation.invoiceLedgerEntryId, tx,
        );
        const invoiceAmount = invoiceEntry.debitAmount + invoiceEntry.creditAmount;
        await this.outstandingRepo.upsert(
          input.companyId, allocation.partyType, allocation.partyId,
          invoiceEntry.sourceDocumentType, invoiceEntry.sourceDocumentId,
          invoiceAmount, newAllocated, allocation.currencyCode,
          invoiceEntry.id,
          tx,
        );
      }

      return cancelled;
    });
  }

  // ════════════════════════════════════════════════════════════
  // SUBLEDGER WRITER — called by Sales/Purchase posting pipelines (EW-03/EW-04)
  // Writes AR/AP ledger entry for an invoice posted by another module.
  // Core Accounting is the only GL writer; this owns AR/AP ledger only.
  // ════════════════════════════════════════════════════════════

  async writeInvoiceLedgerEntry(params: {
    companyId: string;
    partyType: 'customer' | 'supplier';
    partyId: string;
    amount: number;
    currencyCode: string;
    sourceDocumentType: string;
    sourceDocumentId: string;
    postingDate: string;
    accountingPeriod: string;
    idempotencyKey: string;
    createdBy: string;
    /**
     * If true, the invoice was paid directly via Cash/Bank at the time of posting.
     * Must NOT create AP/AR outstanding and must NOT be settable by Payment/Receipt Voucher.
     */
    directCashPayment?: boolean;
    /** Shared transaction supplied by Sales/Purchase when source + GL + AR/AP are posted together. */
    tx?: AccountingTransactionContext;
  }): Promise<ArApLedgerEntry | null> {
    if (params.directCashPayment) {
      return null;
    }

    return this.withUnitOfWork(params.tx, async (tx) => {
      const isAR = params.partyType === 'customer';
      const entry = await this.ledgerRepo.insertEntry({
        companyId: params.companyId,
        partyType: params.partyType,
        partyId: params.partyId,
        entryType: 'invoice',
        debitAmount: isAR ? params.amount : 0,
        creditAmount: isAR ? 0 : params.amount,
        currencyCode: params.currencyCode,
        sourceDocumentType: params.sourceDocumentType,
        sourceDocumentId: params.sourceDocumentId,
        postingDate: params.postingDate,
        accountingPeriod: params.accountingPeriod,
        idempotencyKey: params.idempotencyKey,
        createdBy: params.createdBy,
      }, tx);

      await this.outstandingRepo.upsert(
        params.companyId, params.partyType, params.partyId,
        params.sourceDocumentType, params.sourceDocumentId,
        params.amount, 0, params.currencyCode, entry.id,
        tx,
      );

      return entry;
    });
  }

  /**
   * Called when a source invoice is being cancelled.
   * Blocks cancellation if active allocations/payments exist.
   * Must be called before the invoice cancellation proceeds and should receive
   * the same tx as the source document cancellation flow.
   */
  async checkInvoiceCancellationAllowed(
    companyId: string,
    sourceDocumentId: string,
    tx?: AccountingTransactionContext,
  ): Promise<void> {
    const allocations = await this.allocationRepo.findActiveBySourceDocument(companyId, sourceDocumentId, tx);
    if (allocations.length > 0) {
      throw new Error(
        `Invoice ${sourceDocumentId} cannot be cancelled: ${allocations.length} active allocation(s) exist. Cancel allocations/payments first.`,
      );
    }
  }

  // ════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════

  async queryOutstanding(params: QueryOutstandingParams): Promise<OutstandingCacheRow[]> {
    return this.outstandingRepo.findByParty(params);
  }

  async queryLedger(params: QueryLedgerParams): Promise<ArApLedgerEntry[]> {
    return this.ledgerRepo.query(params);
  }

  async queryAllocations(companyId: string, ledgerEntryId: string, role: 'invoice' | 'payment'): Promise<ArApAllocation[]> {
    if (role === 'invoice') {
      return this.allocationRepo.findActiveByInvoiceEntry(companyId, ledgerEntryId);
    }
    return this.allocationRepo.findActiveByPaymentEntry(companyId, ledgerEntryId);
  }
}
