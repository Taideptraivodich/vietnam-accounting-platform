const test = require('node:test');
const assert = require('node:assert/strict');
const { PurchaseInvoiceService } = require('../src/modules/purchase/services/purchase-invoice.service');

const COMPANY_ID = '00000000-0000-0000-0000-000000000099';
const SUPPLIER_ID = '00000000-0000-0000-0000-000000000001';
const ITEM_ID = '00000000-0000-0000-0000-000000000010';
const WAREHOUSE_ID = '00000000-0000-0000-0000-000000000020';
const RECEIPT_ID = '00000000-0000-0000-0000-000000000030';
const RECEIPT_LINE_ID = '00000000-0000-0000-0000-000000000031';

function mockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  fn.setImpl = (next) => { impl = next; };
  return fn;
}

function makePostingService() {
  return {
    postAccountingDocument: mockFn(async () => ({ journalEntryId: 'je-1', entryIds: ['gl-1'] })),
    reverseAccountingDocument: mockFn(async () => ({ entryIds: ['gl-rev-1'] })),
  };
}

function makeArApService(hasAllocation = false) {
  return {
    createApEntry: mockFn(async () => ({ ledgerIds: ['ap-1'] })),
    createApReversalEntry: mockFn(async () => ({ ledgerIds: ['ap-rev-1'] })),
    assertNoActiveAllocation: mockFn(async () => {
      if (hasAllocation) throw new Error('CANCEL_BLOCKED: active payment allocation exists');
    }),
  };
}

function makeTaxService() {
  return {
    createPurchaseVATEntries: mockFn(async () => ({ taxLedgerIds: ['tax-1'] })),
    reversePurchaseVATEntries: mockFn(async () => ({ taxLedgerIds: ['tax-rev-1'] })),
  };
}

function makeInventoryService() {
  return {
    postPurchaseInvoiceStockIn: mockFn(async (_companyId, invoiceId, lines) => ({
      ledgerEntryIds: ['inv-1'],
      lineResults: lines.map((line) => ({
        invoice_line_id: line.invoice_line_id,
        inventory_account_id: 'acct-inventory',
        stock_value_difference: line.line_amount,
      })),
    })),
    reversePurchaseInvoiceStockIn: mockFn(async () => ({ ledgerEntryIds: ['inv-rev-1'] })),
  };
}

function makePeriodLockService(locked = false) {
  return {
    assertNotLocked: mockFn(async () => {
      if (locked) throw new Error('PERIOD_LOCKED: period is closed');
    }),
  };
}

function makeAccountResolver() {
  return {
    resolveInvoicePostingAccounts: mockFn(async (_companyId, invoice, { inventoryResult, isP2, isDirectCash }) => {
      const lineAccounts = new Map();
      if (isP2) {
        for (const line of invoice.lines || []) {
          lineAccounts.set(line.id, {
            grni_account_id: 'acct-grni',
            grni_account_subtype: 'goods_received_not_invoiced',
          });
        }
      } else {
        for (const lineResult of inventoryResult.lineResults || []) {
          lineAccounts.set(lineResult.invoice_line_id, {
            inventory_account_id: 'acct-inventory',
            inventory_account_subtype: 'merchandise_inventory',
          });
        }
      }
      return {
        lineAccounts,
        vat_input_account_id: 'acct-vat-input',
        vat_input_account_subtype: 'vat_input',
        settlement_account_id: isDirectCash ? 'acct-cash' : 'acct-ap',
        settlement_account_subtype: isDirectCash ? invoice.payment_method : 'payable',
        settlement_kind: isDirectCash ? invoice.payment_method : 'payable',
      };
    }),
    assertNoMissingAccountIds(lines) {
      if (lines.some((line) => !line.account_id)) throw new Error('ACCOUNT_RESOLUTION_FAILED');
    },
  };
}

const P2_PAYLOAD = {
  supplier_id: SUPPLIER_ID,
  invoice_date: '2026-06-01',
  posting_date: '2026-06-01',
  payment_method: 'credit',
  lines: [{
    item_id: ITEM_ID,
    warehouse_id: WAREHOUSE_ID,
    quantity: 10,
    unit_price: 100,
    tax_rate: 10,
    purchase_receipt_id: RECEIPT_ID,
    purchase_receipt_line_id: RECEIPT_LINE_ID,
  }],
};

const P1_PAYLOAD = {
  supplier_id: SUPPLIER_ID,
  invoice_date: '2026-06-01',
  posting_date: '2026-06-01',
  payment_method: 'credit',
  lines: [{
    item_id: ITEM_ID,
    warehouse_id: WAREHOUSE_ID,
    quantity: 10,
    unit_price: 100,
    tax_rate: 10,
  }],
};

function makeDbForCreate() {
  const trx = () => ({
    insert: mockFn(async () => [1]),
    where: () => trx(),
    first: mockFn(async () => null),
    update: mockFn(async () => 1),
  });
  return { transaction: async (fn) => fn(trx) };
}

function buildTrx(invoiceId, status, paymentMethod = 'credit', pattern = 'receipt_then_invoice') {
  const isP2 = pattern === 'receipt_then_invoice';
  const invoice = {
    id: invoiceId,
    company_id: COMPANY_ID,
    supplier_id: SUPPLIER_ID,
    invoice_number: 'PI-001',
    invoice_date: '2026-06-01',
    posting_date: '2026-06-01',
    status,
    payment_method: paymentMethod,
    cash_bank_account_id: null,
    currency_code: 'VND',
    stock_update_pattern: pattern,
    subtotal_amount: 1000,
    tax_amount: 100,
    total_amount: 1100,
    received_qty: 10,
    billed_qty: 10,
    received_amount: 1000,
    billed_amount: 1000,
    idempotency_key: null,
    due_date: null,
  };
  const lines = [{
    id: 'line-1',
    company_id: COMPANY_ID,
    purchase_invoice_id: invoiceId,
    line_number: 1,
    item_id: ITEM_ID,
    warehouse_id: WAREHOUSE_ID,
    quantity: 10,
    unit_price: 100,
    line_amount: 1000,
    tax_rate: 10,
    tax_amount: 100,
    purchase_receipt_id: isP2 ? RECEIPT_ID : null,
    purchase_receipt_line_id: isP2 ? RECEIPT_LINE_ID : null,
  }];

  const trx = (table) => {
    const q = {
      where: () => q,
      whereNot: () => q,
      orderBy: async () => (table === 'purchase_invoice_lines' ? lines : []),
      first: async () => (table === 'purchase_invoices' ? invoice : null),
      insert: mockFn(async () => [1]),
      update: mockFn(async () => 1),
      increment: mockFn(async () => 1),
    };
    return q;
  };
  return trx;
}

function makeService({ trx, inventoryService = makeInventoryService(), postingService = makePostingService(), arApService = makeArApService(), accountResolver = makeAccountResolver() } = {}) {
  return {
    svc: new PurchaseInvoiceService({
      db: trx ? { transaction: async (fn) => fn(trx) } : makeDbForCreate(),
      inventoryService,
      postingService,
      arApService,
      taxService: makeTaxService(),
      periodLockService: makePeriodLockService(),
      accountResolver,
    }),
    inventoryService,
    postingService,
    arApService,
    accountResolver,
  };
}

test('createDraft accepts P1 direct-stock invoice without receipt links', async () => {
  const { svc } = makeService();
  const result = await svc.createDraft(COMPANY_ID, P1_PAYLOAD);
  assert.equal(result.subtotal_amount, 1000);
  assert.equal(result.tax_amount, 100);
  assert.equal(result.total_amount, 1100);
  assert.equal(result.stock_update_pattern, 'direct_invoice_stock');
  assert.equal(result.lines[0].purchase_receipt_id, null);
});

test('createDraft accepts P2 receipt-linked invoice and marks receipt_then_invoice', async () => {
  const { svc } = makeService();
  const result = await svc.createDraft(COMPANY_ID, P2_PAYLOAD);
  assert.equal(result.stock_update_pattern, 'receipt_then_invoice');
  assert.equal(result.lines[0].purchase_receipt_id, RECEIPT_ID);
});

test('createDraft rejects partial receipt links instead of ambiguous invoice-before-receipt', async () => {
  const { svc } = makeService();
  await assert.rejects(
    svc.createDraft(COMPANY_ID, {
      ...P2_PAYLOAD,
      lines: [{ ...P2_PAYLOAD.lines[0], purchase_receipt_line_id: undefined }],
    }),
    /VALIDATION_ERROR|receipt-before-invoice/
  );
});

test('postInvoice P1 posts EW-05 stock-in, Dr Inventory, Dr VAT input, Cr AP, and creates AP for credit PI', async () => {
  const invoiceId = '00000000-0000-0000-0000-000000000050';
  const { svc, inventoryService, postingService, arApService } = makeService({
    trx: buildTrx(invoiceId, 'draft', 'credit', 'direct_invoice_stock'),
  });

  const result = await svc.postInvoice(COMPANY_ID, invoiceId);
  assert.equal(inventoryService.postPurchaseInvoiceStockIn.calls.length, 1);
  assert.equal(postingService.postAccountingDocument.calls.length, 1);
  const request = postingService.postAccountingDocument.calls[0][0];
  assert.deepEqual(request.lines.map((line) => line.account_id), ['acct-inventory', 'acct-vat-input', 'acct-ap']);
  assert.equal(request.lines[0].debit, 1000);
  assert.equal(request.lines[0].account_subtype, 'merchandise_inventory');
  assert.equal(request.lines[1].tax_direction, 'input');
  assert.equal(request.lines[2].credit, 1100);
  assert.equal(arApService.createApEntry.calls.length, 1);
  assert.equal(result.stockUpdatePattern, 'direct_invoice_stock');
  assert.deepEqual(result.inventoryLedgerIds, ['inv-1']);
  assert.equal(result.apOutstandingCreated, true);
});

test('postInvoice P1 direct cash/bank credits cash/bank and creates no AP outstanding', async () => {
  const invoiceId = '00000000-0000-0000-0000-000000000052';
  const { svc, postingService, arApService } = makeService({
    trx: buildTrx(invoiceId, 'draft', 'cash', 'direct_invoice_stock'),
  });

  const result = await svc.postInvoice(COMPANY_ID, invoiceId);
  const request = postingService.postAccountingDocument.calls[0][0];
  assert.equal(request.lines[2].account_id, 'acct-cash');
  assert.equal(request.lines[2].party_id, null);
  assert.equal(arApService.createApEntry.calls.length, 0);
  assert.equal(result.apOutstandingCreated, false);
  assert.equal(result.paymentVoucherSettlementAllowed, false);
});

test('postInvoice P2 clears GRNI, composes VAT input GL, and does not call EW-05 stock-in', async () => {
  const invoiceId = '00000000-0000-0000-0000-000000000053';
  const { svc, inventoryService, postingService, arApService } = makeService({
    trx: buildTrx(invoiceId, 'draft', 'credit', 'receipt_then_invoice'),
  });

  const result = await svc.postInvoice(COMPANY_ID, invoiceId);
  assert.equal(inventoryService.postPurchaseInvoiceStockIn.calls.length, 0);
  const request = postingService.postAccountingDocument.calls[0][0];
  assert.deepEqual(request.lines.map((line) => line.account_id), ['acct-grni', 'acct-vat-input', 'acct-ap']);
  assert.equal(request.lines[0].account_subtype, 'goods_received_not_invoiced');
  assert.equal(request.lines[0].clears_source_document_type, 'purchase_receipt');
  assert.equal(arApService.createApEntry.calls.length, 1);
  assert.equal(result.stockUpdatePattern, 'receipt_then_invoice');
  assert.deepEqual(result.inventoryLedgerIds, []);
});

test('cancelInvoice P1 reverses EW-05 stock-in and EW-01 accounting document', async () => {
  const invoiceId = '00000000-0000-0000-0000-000000000060';
  const { svc, inventoryService, postingService } = makeService({
    trx: buildTrx(invoiceId, 'posted', 'credit', 'direct_invoice_stock'),
  });

  const result = await svc.cancelInvoice(COMPANY_ID, invoiceId);
  assert.equal(inventoryService.reversePurchaseInvoiceStockIn.calls.length, 1);
  assert.equal(postingService.reverseAccountingDocument.calls.length, 1);
  assert.deepEqual(result.inventoryReversalIds, ['inv-rev-1']);
});
