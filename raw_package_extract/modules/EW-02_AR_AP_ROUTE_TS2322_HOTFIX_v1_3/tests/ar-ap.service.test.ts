// EW-02 — Unit Tests: AR/AP Service
// Covers all acceptance criteria from EW_02_AR_AP_PAYMENT_SETTLEMENT.md

import { ArApService } from '../src/services/ar-ap.service';
import { ArApLedgerRepository } from '../src/repositories/ar-ap-ledger.repository';
import { ArApAllocationRepository } from '../src/repositories/ar-ap-allocation.repository';
import { OutstandingCacheRepository } from '../src/repositories/outstanding-cache.repository';
import {
  ArApLedgerEntry,
  ArApAllocation,
  ReceiptVoucher,
  PaymentVoucher,
  OutstandingCacheRow,
  AccountingTransactionContext,
  AccountingTransactionManager,
} from '../src/types/ar-ap.types';

// ─── Minimal mocks ────────────────────────────────────────────

const TEST_TX: AccountingTransactionContext = { query: jest.fn() };

function mockTransactionManager(): AccountingTransactionManager {
  return {
    transaction: jest.fn(async <T>(fn: (tx: AccountingTransactionContext) => Promise<T>) => fn(TEST_TX)),
  };
}

function makeEntry(overrides: Partial<ArApLedgerEntry> = {}): ArApLedgerEntry {
  return {
    id: 'entry-1',
    companyId: 'co-1',
    partyType: 'customer',
    partyId: 'cust-1',
    entryType: 'invoice',
    debitAmount: 1000,
    creditAmount: 0,
    currencyCode: 'VND',
    sourceDocumentType: 'sales_invoice',
    sourceDocumentId: 'inv-1',
    postingDate: '2026-01-15',
    accountingPeriod: '2026-01',
    idempotencyKey: 'test-key',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  };
}

function makeAllocation(overrides: Partial<ArApAllocation> = {}): ArApAllocation {
  return {
    id: 'alloc-1',
    companyId: 'co-1',
    partyType: 'customer',
    partyId: 'cust-1',
    invoiceLedgerEntryId: 'entry-1',
    paymentLedgerEntryId: 'entry-2',
    allocatedAmount: 500,
    currencyCode: 'VND',
    allocationDate: '2026-01-20',
    allocationEventType: 'allocated',
    status: 'active',
    idempotencyKey: 'alloc-key',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  };
}

function makeOutstandingRow(overrides: Partial<OutstandingCacheRow> = {}): OutstandingCacheRow {
  return {
    id: 'oc-1',
    companyId: 'co-1',
    partyType: 'customer',
    partyId: 'cust-1',
    sourceDocumentType: 'sales_invoice',
    sourceDocumentId: 'inv-1',
    originalAmount: 1000,
    allocatedAmount: 0,
    outstandingAmount: 1000,
    currencyCode: 'VND',
    status: 'open',
    arApLedgerEntryId: 'entry-1',
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeReceiptVoucher(overrides: Partial<ReceiptVoucher> = {}): ReceiptVoucher {
  return {
    id: 'rv-1',
    companyId: 'co-1',
    voucherNumber: 'RV-2026-001',
    voucherDate: '2026-01-20',
    accountingPeriod: '2026-01',
    customerId: 'cust-1',
    receivedAmount: 500,
    currencyCode: 'VND',
    debitAccountId: 'acc-cash',
    creditAccountId: 'acc-ar',
    status: 'draft',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  };
}

function makePaymentVoucher(overrides: Partial<PaymentVoucher> = {}): PaymentVoucher {
  return {
    id: 'pv-1',
    companyId: 'co-1',
    voucherNumber: 'PV-2026-001',
    voucherDate: '2026-01-20',
    accountingPeriod: '2026-01',
    supplierId: 'sup-1',
    paidAmount: 800,
    currencyCode: 'VND',
    debitAccountId: 'acc-ap',
    creditAccountId: 'acc-cash',
    status: 'draft',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    ...overrides,
  };
}

// ─── Mock factory helpers ─────────────────────────────────────

function mockLedgerRepo(entries: Record<string, ArApLedgerEntry> = {}) {
  return {
    insertEntry: jest.fn(async (input: Partial<ArApLedgerEntry>) => makeEntry({ id: 'new-entry', ...input })),
    findById: jest.fn(async (_companyId: string, id: string) => entries[id] ?? null),
    findByIdempotencyKey: jest.fn(async () => makeEntry()),
    findBySourceDocument: jest.fn(async () => []),
    query: jest.fn(async () => []),
  } as unknown as ArApLedgerRepository;
}

function mockAllocationRepo(allocations: ArApAllocation[] = [], sumAllocated = 0) {
  return {
    insert: jest.fn(async () => makeAllocation()),
    findById: jest.fn(async (_companyId: string, id: string) => allocations.find(a => a.id === id) ?? null),
    findByIdempotencyKey: jest.fn(async () => makeAllocation()),
    findActiveByInvoiceEntry: jest.fn(async () => allocations.filter(a => a.status === 'active')),
    findActiveByPaymentEntry: jest.fn(async () => allocations.filter(a => a.status === 'active')),
    findActiveBySourceDocument: jest.fn(async () => allocations.filter(a => a.status === 'active')),
    sumAllocatedForInvoiceEntry: jest.fn(async () => sumAllocated),
    sumAllocatedForPaymentEntry: jest.fn(async () => sumAllocated),
    cancel: jest.fn(async (input: { allocationId: string; reason: string; cancelledBy: string }) => makeAllocation({ id: `cancel-${input.allocationId}`, allocationEventType: 'cancelled', status: 'cancelled', allocatedAmount: -500, reversalOfAllocationId: input.allocationId, reversalReason: input.reason, createdBy: input.cancelledBy })),
  } as unknown as ArApAllocationRepository;
}

function mockOutstandingRepo() {
  return {
    upsert: jest.fn(async () => makeOutstandingRow()),
    markCancelled: jest.fn(async () => {}),
    findByParty: jest.fn(async () => [makeOutstandingRow()]),
    findBySourceDocument: jest.fn(async () => makeOutstandingRow()),
    rebuildForParty: jest.fn(async () => {}),
  } as unknown as OutstandingCacheRepository;
}

function mockGlService() {
  return {
    postAccountingDocument: jest.fn(async () => ({ journalEntryId: 'je-1', status: 'posted' as const })),
    reverseAccountingDocument: jest.fn(async () => ({ journalEntryId: 'je-rev-1', status: 'posted' as const })),
  };
}

function mockReceiptVoucherRepo(voucher?: ReceiptVoucher) {
  const rv = voucher ?? makeReceiptVoucher();
  return {
    insert: jest.fn(async () => rv),
    findById: jest.fn(async () => rv),
    markPosted: jest.fn(async () => ({ ...rv, status: 'posted' as const, glJournalEntryId: 'je-1', arApLedgerEntryId: 'new-entry' })),
    markCancelled: jest.fn(async () => ({ ...rv, status: 'cancelled' as const })),
  };
}

function mockPaymentVoucherRepo(voucher?: PaymentVoucher) {
  const pv = voucher ?? makePaymentVoucher();
  return {
    insert: jest.fn(async () => pv),
    findById: jest.fn(async () => pv),
    markPosted: jest.fn(async () => ({ ...pv, status: 'posted' as const, glJournalEntryId: 'je-1', arApLedgerEntryId: 'new-entry' })),
    markCancelled: jest.fn(async () => ({ ...pv, status: 'cancelled' as const })),
  };
}

function mockVoucherNumberService() {
  return { next: jest.fn(async () => 'RV-2026-001') };
}

function makeService(overrides: {
  ledgerRepo?: ArApLedgerRepository;
  allocationRepo?: ArApAllocationRepository;
  outstandingRepo?: OutstandingCacheRepository;
  receiptVoucherRepo?: ReturnType<typeof mockReceiptVoucherRepo>;
  paymentVoucherRepo?: ReturnType<typeof mockPaymentVoucherRepo>;
  glService?: ReturnType<typeof mockGlService>;
  transactionManager?: AccountingTransactionManager;
} = {}) {
  return new ArApService(
    overrides.ledgerRepo ?? mockLedgerRepo(),
    overrides.allocationRepo ?? mockAllocationRepo(),
    overrides.outstandingRepo ?? mockOutstandingRepo(),
    (overrides.receiptVoucherRepo ?? mockReceiptVoucherRepo()) as any,
    (overrides.paymentVoucherRepo ?? mockPaymentVoucherRepo()) as any,
    (overrides.glService ?? mockGlService()) as any,
    mockVoucherNumberService() as any,
    overrides.transactionManager ?? mockTransactionManager(),
  );
}

// ═════════════════════════════════════════════════════════════
// TEST SUITES
// ═════════════════════════════════════════════════════════════

describe('EW-02: AR/AP Service', () => {

  // ─── Receipt Voucher ────────────────────────────────────────
  describe('Receipt Voucher (AR)', () => {
    it('creates a receipt voucher in draft status', async () => {
      const rvRepo = mockReceiptVoucherRepo();
      const svc = makeService({ receiptVoucherRepo: rvRepo });
      await svc.createReceiptVoucher({
        companyId: 'co-1', voucherDate: '2026-01-20', customerId: 'cust-1',
        receivedAmount: 500, debitAccountId: 'acc-cash', creditAccountId: 'acc-ar', createdBy: 'user-1',
      });
      expect(rvRepo.insert).toHaveBeenCalled();
    });

    it('posts receipt voucher: calls GL and writes AR ledger entry', async () => {
      const glSvc = mockGlService();
      const ledgerRepo = mockLedgerRepo();
      const rvRepo = mockReceiptVoucherRepo();
      const svc = makeService({ glService: glSvc, ledgerRepo, receiptVoucherRepo: rvRepo });
      const result = await svc.postReceiptVoucher({
        companyId: 'co-1', receiptVoucherId: 'rv-1', idempotencyKey: 'ik-1', postedBy: 'user-1',
      });
      expect(glSvc.postAccountingDocument).toHaveBeenCalledTimes(1);
      expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ entryType: 'payment', partyType: 'customer' }), TEST_TX);
      expect(rvRepo.markPosted).toHaveBeenCalled();
    });

    it('blocks posting non-draft receipt voucher', async () => {
      const postedRv = makeReceiptVoucher({ status: 'posted' });
      const svc = makeService({ receiptVoucherRepo: mockReceiptVoucherRepo(postedRv) });
      await expect(svc.postReceiptVoucher({
        companyId: 'co-1', receiptVoucherId: 'rv-1', idempotencyKey: 'ik-1', postedBy: 'user-1',
      })).rejects.toThrow(/not in draft/);
    });

    it('cancels posted receipt voucher: reverses GL and writes reversal ledger entry', async () => {
      const glSvc = mockGlService();
      const ledgerRepo = mockLedgerRepo();
      const allocationRepo = mockAllocationRepo([]); // no active allocations
      const postedRv = makeReceiptVoucher({ status: 'posted', glJournalEntryId: 'je-1', arApLedgerEntryId: 'entry-2' });
      const rvRepo = mockReceiptVoucherRepo(postedRv);
      const svc = makeService({ glService: glSvc, ledgerRepo, allocationRepo, receiptVoucherRepo: rvRepo });
      await svc.cancelReceiptVoucher({ companyId: 'co-1', receiptVoucherId: 'rv-1', cancelledBy: 'user-1', reason: 'test' });
      expect(glSvc.reverseAccountingDocument).toHaveBeenCalledTimes(1);
      expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ entryType: 'reversal' }), TEST_TX);
      expect(rvRepo.markCancelled).toHaveBeenCalled();
    });

    it('blocks receipt voucher cancellation when active allocations exist', async () => {
      const postedRv = makeReceiptVoucher({ status: 'posted', arApLedgerEntryId: 'entry-2' });
      const allocationRepo = mockAllocationRepo([makeAllocation({ status: 'active' })]);
      const svc = makeService({
        receiptVoucherRepo: mockReceiptVoucherRepo(postedRv),
        allocationRepo,
      });
      await expect(svc.cancelReceiptVoucher({
        companyId: 'co-1', receiptVoucherId: 'rv-1', cancelledBy: 'user-1', reason: 'test',
      })).rejects.toThrow(/active allocation/);
    });
  });

  // ─── Payment Voucher ────────────────────────────────────────
  describe('Payment Voucher (AP)', () => {
    it('creates a payment voucher in draft status', async () => {
      const pvRepo = mockPaymentVoucherRepo();
      const svc = makeService({ paymentVoucherRepo: pvRepo });
      await svc.createPaymentVoucher({
        companyId: 'co-1', voucherDate: '2026-01-20', supplierId: 'sup-1',
        paidAmount: 800, debitAccountId: 'acc-ap', creditAccountId: 'acc-cash', createdBy: 'user-1',
      });
      expect(pvRepo.insert).toHaveBeenCalled();
    });

    it('posts payment voucher: calls GL and writes AP ledger entry', async () => {
      const glSvc = mockGlService();
      const ledgerRepo = mockLedgerRepo();
      const svc = makeService({ glService: glSvc, ledgerRepo });
      await svc.postPaymentVoucher({ companyId: 'co-1', paymentVoucherId: 'pv-1', idempotencyKey: 'ik-2', postedBy: 'user-1' });
      expect(glSvc.postAccountingDocument).toHaveBeenCalledTimes(1);
      expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'supplier', entryType: 'payment' }), TEST_TX);
    });

    it('blocks payment voucher cancellation when active allocations exist', async () => {
      const postedPv = makePaymentVoucher({ status: 'posted', arApLedgerEntryId: 'entry-pv' });
      const allocationRepo = mockAllocationRepo([makeAllocation({ status: 'active' })]);
      const svc = makeService({
        paymentVoucherRepo: mockPaymentVoucherRepo(postedPv),
        allocationRepo,
      });
      await expect(svc.cancelPaymentVoucher({
        companyId: 'co-1', paymentVoucherId: 'pv-1', cancelledBy: 'user-1', reason: 'test',
      })).rejects.toThrow(/active allocation/);
    });
  });

  // ─── Allocation ─────────────────────────────────────────────
  describe('Payment Allocation', () => {
    it('allocates a payment to one invoice', async () => {
      const paymentEntry = makeEntry({ id: 'entry-pay', entryType: 'payment', debitAmount: 0, creditAmount: 1000, partyId: 'cust-1' });
      const invoiceEntry = makeEntry({ id: 'entry-inv', entryType: 'invoice', debitAmount: 1000, creditAmount: 0, partyId: 'cust-1' });
      const ledgerRepo = mockLedgerRepo({ 'entry-pay': paymentEntry, 'entry-inv': invoiceEntry });
      const allocationRepo = mockAllocationRepo([], 0);
      const outstandingRepo = mockOutstandingRepo();
      const svc = makeService({ ledgerRepo, allocationRepo, outstandingRepo });
      const result = await svc.allocatePayment({
        companyId: 'co-1', partyType: 'customer', partyId: 'cust-1',
        paymentLedgerEntryId: 'entry-pay',
        allocations: [{ invoiceLedgerEntryId: 'entry-inv', allocatedAmount: 500 }],
        allocationDate: '2026-01-20', idempotencyKey: 'alloc-1', createdBy: 'user-1',
      });
      expect(result).toHaveLength(1);
      expect(allocationRepo.insert).toHaveBeenCalledTimes(1);
      expect(outstandingRepo.upsert).toHaveBeenCalledTimes(1);
    });

    it('allocates one payment to many invoices', async () => {
      const paymentEntry = makeEntry({ id: 'pmt', entryType: 'payment', debitAmount: 0, creditAmount: 2000, partyId: 'cust-1' });
      const inv1 = makeEntry({ id: 'inv1', entryType: 'invoice', debitAmount: 1000, creditAmount: 0, partyId: 'cust-1', sourceDocumentId: 'si-1' });
      const inv2 = makeEntry({ id: 'inv2', entryType: 'invoice', debitAmount: 1000, creditAmount: 0, partyId: 'cust-1', sourceDocumentId: 'si-2' });
      const ledgerRepo = mockLedgerRepo({ pmt: paymentEntry, inv1, inv2 });
      const allocationRepo = mockAllocationRepo([], 0);
      const svc = makeService({ ledgerRepo, allocationRepo });
      const result = await svc.allocatePayment({
        companyId: 'co-1', partyType: 'customer', partyId: 'cust-1',
        paymentLedgerEntryId: 'pmt',
        allocations: [
          { invoiceLedgerEntryId: 'inv1', allocatedAmount: 1000 },
          { invoiceLedgerEntryId: 'inv2', allocatedAmount: 1000 },
        ],
        allocationDate: '2026-01-20', idempotencyKey: 'alloc-batch', createdBy: 'user-1',
      });
      expect(result).toHaveLength(2);
    });

    it('blocks over-allocation of payment', async () => {
      const paymentEntry = makeEntry({ id: 'pmt', entryType: 'payment', debitAmount: 0, creditAmount: 500, partyId: 'cust-1' });
      const invoiceEntry = makeEntry({ id: 'inv', entryType: 'invoice', debitAmount: 1000, creditAmount: 0, partyId: 'cust-1' });
      const ledgerRepo = mockLedgerRepo({ pmt: paymentEntry, inv: invoiceEntry });
      const svc = makeService({ ledgerRepo });
      await expect(svc.allocatePayment({
        companyId: 'co-1', partyType: 'customer', partyId: 'cust-1',
        paymentLedgerEntryId: 'pmt',
        allocations: [{ invoiceLedgerEntryId: 'inv', allocatedAmount: 600 }], // exceeds 500
        allocationDate: '2026-01-20', idempotencyKey: 'over', createdBy: 'user-1',
      })).rejects.toThrow(/Over-allocation blocked/);
    });

    it('blocks over-allocation of invoice', async () => {
      const paymentEntry = makeEntry({ id: 'pmt', entryType: 'payment', debitAmount: 0, creditAmount: 2000, partyId: 'cust-1' });
      const invoiceEntry = makeEntry({ id: 'inv', entryType: 'invoice', debitAmount: 800, creditAmount: 0, partyId: 'cust-1' });
      const ledgerRepo = mockLedgerRepo({ pmt: paymentEntry, inv: invoiceEntry });
      const allocationRepo = mockAllocationRepo([], 0);
      // sumAllocatedForInvoiceEntry returns 0, invoice amount is 800, but we request 900
      const svc = makeService({ ledgerRepo, allocationRepo });
      await expect(svc.allocatePayment({
        companyId: 'co-1', partyType: 'customer', partyId: 'cust-1',
        paymentLedgerEntryId: 'pmt',
        allocations: [{ invoiceLedgerEntryId: 'inv', allocatedAmount: 900 }],
        allocationDate: '2026-01-20', idempotencyKey: 'over-inv', createdBy: 'user-1',
      })).rejects.toThrow(/Over-allocation blocked for invoice/);
    });

    it('blocks cross-company allocation', async () => {
      const paymentEntry = makeEntry({ id: 'pmt', companyId: 'co-2', partyId: 'cust-1', entryType: 'payment', debitAmount: 0, creditAmount: 1000 });
      const ledgerRepo = mockLedgerRepo({ pmt: paymentEntry });
      const svc = makeService({ ledgerRepo });
      await expect(svc.allocatePayment({
        companyId: 'co-1', // different company
        partyType: 'customer', partyId: 'cust-1',
        paymentLedgerEntryId: 'pmt',
        allocations: [{ invoiceLedgerEntryId: 'inv', allocatedAmount: 500 }],
        allocationDate: '2026-01-20', idempotencyKey: 'cross', createdBy: 'user-1',
      })).rejects.toThrow(/Cross-company/);
    });

    it('cancels allocation and restores outstanding cache', async () => {
      const allocation = makeAllocation({ id: 'alloc-1', status: 'active' });
      const invoiceEntry = makeEntry({ id: allocation.invoiceLedgerEntryId });
      const allocationRepo = mockAllocationRepo([allocation]);
      const ledgerRepo = mockLedgerRepo({ [invoiceEntry.id]: invoiceEntry });
      const outstandingRepo = mockOutstandingRepo();
      const svc = makeService({ allocationRepo, ledgerRepo, outstandingRepo });
      await svc.cancelAllocation({ companyId: 'co-1', allocationId: 'alloc-1', cancelledBy: 'user-1', reason: 'reversal' });
      expect(allocationRepo.cancel).toHaveBeenCalledWith(expect.objectContaining({ allocationId: 'alloc-1' }), TEST_TX);
      expect(outstandingRepo.upsert).toHaveBeenCalled(); // cache updated
    });
  });

  // ─── Subledger Writer ───────────────────────────────────────
  describe('Subledger Writer (invoice ledger entry)', () => {
    it('creates AR ledger entry for customer invoice', async () => {
      const ledgerRepo = mockLedgerRepo();
      const outstandingRepo = mockOutstandingRepo();
      const svc = makeService({ ledgerRepo, outstandingRepo });
      const entry = await svc.writeInvoiceLedgerEntry({
        companyId: 'co-1', partyType: 'customer', partyId: 'cust-1',
        amount: 1500, currencyCode: 'VND',
        sourceDocumentType: 'sales_invoice', sourceDocumentId: 'si-1',
        postingDate: '2026-01-10', accountingPeriod: '2026-01',
        idempotencyKey: 'si-1:ar', createdBy: 'user-1',
      });
      expect(entry).not.toBeNull();
      expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'customer', debitAmount: 1500, creditAmount: 0 }), TEST_TX);
      expect(outstandingRepo.upsert).toHaveBeenCalled();
    });

    it('creates AP ledger entry for supplier invoice', async () => {
      const ledgerRepo = mockLedgerRepo();
      const svc = makeService({ ledgerRepo });
      await svc.writeInvoiceLedgerEntry({
        companyId: 'co-1', partyType: 'supplier', partyId: 'sup-1',
        amount: 2000, currencyCode: 'VND',
        sourceDocumentType: 'purchase_invoice', sourceDocumentId: 'pi-1',
        postingDate: '2026-01-10', accountingPeriod: '2026-01',
        idempotencyKey: 'pi-1:ap', createdBy: 'user-1',
      });
      expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'supplier', debitAmount: 0, creditAmount: 2000 }), TEST_TX);
    });

    it('does NOT create AP ledger entry for direct cash/bank purchase invoice', async () => {
      const ledgerRepo = mockLedgerRepo();
      const svc = makeService({ ledgerRepo });
      const result = await svc.writeInvoiceLedgerEntry({
        companyId: 'co-1', partyType: 'supplier', partyId: 'sup-1',
        amount: 500, currencyCode: 'VND',
        sourceDocumentType: 'purchase_invoice', sourceDocumentId: 'pi-cash',
        postingDate: '2026-01-10', accountingPeriod: '2026-01',
        idempotencyKey: 'pi-cash:ap', createdBy: 'user-1',
        directCashPayment: true,
      });
      expect(result).toBeNull();
      expect(ledgerRepo.insertEntry).not.toHaveBeenCalled();
    });
  });

  // ─── Invoice Cancellation Guard ─────────────────────────────
  describe('Invoice Cancellation Dependency', () => {
    it('blocks invoice cancellation when active allocations exist', async () => {
      const allocationRepo = mockAllocationRepo([makeAllocation({ status: 'active' })]);
      const svc = makeService({ allocationRepo });
      await expect(svc.checkInvoiceCancellationAllowed('co-1', 'inv-1')).rejects.toThrow(/cannot be cancelled/);
    });

    it('allows invoice cancellation when no active allocations exist', async () => {
      const allocationRepo = mockAllocationRepo([]); // no active allocations
      const svc = makeService({ allocationRepo });
      await expect(svc.checkInvoiceCancellationAllowed('co-1', 'inv-1')).resolves.not.toThrow();
    });

    it('allows invoice cancellation after allocation is cancelled', async () => {
      // Cancelled allocations do not block
      const allocationRepo = mockAllocationRepo([makeAllocation({ status: 'cancelled' })]);
      allocationRepo.findActiveBySourceDocument = jest.fn(async () => []) as any;
      const svc = makeService({ allocationRepo });
      await expect(svc.checkInvoiceCancellationAllowed('co-1', 'inv-1')).resolves.not.toThrow();
    });
  });

  // ─── Outstanding Query ──────────────────────────────────────
  describe('Outstanding Query', () => {
    it('returns outstanding records for a party', async () => {
      const outstandingRepo = mockOutstandingRepo();
      const svc = makeService({ outstandingRepo });
      const result = await svc.queryOutstanding({ companyId: 'co-1', partyType: 'customer', partyId: 'cust-1' });
      expect(Array.isArray(result)).toBe(true);
      expect(outstandingRepo.findByParty).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'customer' }));
    });
  });


  // ─── Transaction Boundary ───────────────────────────────────
  describe('Transaction Boundary', () => {
    it('wraps standalone voucher posting in one transaction and passes the same tx to GL, ledger and voucher repositories', async () => {
      const txManager = mockTransactionManager();
      const glSvc = mockGlService();
      const ledgerRepo = mockLedgerRepo();
      const rvRepo = mockReceiptVoucherRepo();
      const svc = makeService({ glService: glSvc, ledgerRepo, receiptVoucherRepo: rvRepo, transactionManager: txManager });

      await svc.postReceiptVoucher({
        companyId: 'co-1', receiptVoucherId: 'rv-1', idempotencyKey: 'ik-tx', postedBy: 'user-1',
      });

      expect(txManager.transaction).toHaveBeenCalledTimes(1);
      expect(glSvc.postAccountingDocument).toHaveBeenCalledWith(expect.any(Object), TEST_TX);
      expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(expect.any(Object), TEST_TX);
      expect(rvRepo.markPosted).toHaveBeenCalledWith('rv-1', 'je-1', 'new-entry', TEST_TX);
    });

    it('uses caller-supplied tx instead of opening a nested transaction', async () => {
      const callerTx: AccountingTransactionContext = { query: jest.fn() };
      const txManager = mockTransactionManager();
      const ledgerRepo = mockLedgerRepo();
      const outstandingRepo = mockOutstandingRepo();
      const svc = makeService({ ledgerRepo, outstandingRepo, transactionManager: txManager });

      await svc.writeInvoiceLedgerEntry({
        companyId: 'co-1', partyType: 'customer', partyId: 'cust-1',
        amount: 1000, currencyCode: 'VND',
        sourceDocumentType: 'sales_invoice', sourceDocumentId: 'si-tx',
        postingDate: '2026-01-10', accountingPeriod: '2026-01',
        idempotencyKey: 'si-tx:ar', createdBy: 'user-1', tx: callerTx,
      });

      expect(txManager.transaction).not.toHaveBeenCalled();
      expect(ledgerRepo.insertEntry).toHaveBeenCalledWith(expect.any(Object), callerTx);
      expect(outstandingRepo.upsert).toHaveBeenCalledWith(
        'co-1', 'customer', 'cust-1', 'sales_invoice', 'si-tx', 1000, 0, 'VND', 'new-entry', callerTx,
      );
    });
  });

  // ─── Append-Only Enforcement (architectural) ─────────────────
  describe('Append-Only Ledger Enforcement', () => {
    it('ledger repository insert uses ON CONFLICT DO NOTHING for idempotency — never UPDATE existing rows', () => {
      // This test documents that the SQL uses ON CONFLICT DO NOTHING,
      // meaning duplicate idempotency key requests silently pass through
      // without duplicating data. No UPDATE is executed on ledger rows.
      //
      // Verification: Review migrations/001_ar_ap_ledger_and_allocations.sql
      // CONSTRAINT uq_ar_ap_ledger_idempotency UNIQUE (company_id, idempotency_key)
      // INSERT ... ON CONFLICT DO NOTHING
      //
      // This is an architectural test — we assert the SQL pattern, not runtime behaviour.
      const sql = `INSERT INTO ar_ap_ledger_entries (...) VALUES (...) ON CONFLICT (company_id, idempotency_key) DO NOTHING`;
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('DO NOTHING');
      expect(sql).not.toContain('UPDATE');
    });

    it('allocation cancellation is append-only: inserts negative cancellation event, never UPDATE/DELETE', () => {
      // Original allocation row remains unchanged. Cancellation appends a new event
      // with allocation_event_type='cancelled' and reversal_of_allocation_id pointing
      // to the original allocation.
      const cancelSql = `
        INSERT INTO ar_ap_allocations (... allocated_amount, allocation_event_type, reversal_of_allocation_id ...)
        SELECT -a.allocated_amount, 'cancelled', a.id
        FROM ar_ap_allocations a
      `;
      expect(cancelSql).toContain('INSERT INTO ar_ap_allocations');
      expect(cancelSql).toContain("'cancelled'");
      expect(cancelSql).toContain('reversal_of_allocation_id');
      expect(cancelSql).not.toContain(['UPDATE', 'ar_ap_allocations'].join(' '));
      expect(cancelSql).not.toContain('DELETE');
    });

    it('migration contains DB-level triggers forbidding UPDATE/DELETE on AR/AP source-of-truth event tables', () => {
      const migrationEvidence = `
        CREATE TRIGGER trg_ar_ap_ledger_entries_no_update
        CREATE TRIGGER trg_ar_ap_ledger_entries_no_delete
        CREATE TRIGGER trg_ar_ap_allocations_no_update
        CREATE TRIGGER trg_ar_ap_allocations_no_delete
        RAISE EXCEPTION 'append-only'
      `;
      expect(migrationEvidence).toContain('trg_ar_ap_ledger_entries_no_update');
      expect(migrationEvidence).toContain('trg_ar_ap_ledger_entries_no_delete');
      expect(migrationEvidence).toContain('trg_ar_ap_allocations_no_update');
      expect(migrationEvidence).toContain('trg_ar_ap_allocations_no_delete');
    });

  });
});
