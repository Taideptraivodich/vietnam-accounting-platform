const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SALES_STOCK_PATTERNS,
  PAYMENT_METHODS,
  ACCOUNT_SUBTYPES,
  SalesPostingService,
  AccountContractResolver,
} = require('../src/sales');

const {
  InMemoryCompanySettingsRepository,
  InMemoryAccountSettingsRepository,
  InMemorySalesInvoiceRepository,
  InMemoryDeliveryNoteRepository,
} = require('../src/sales/services/inMemoryRepositories');

function fixture({
  invoicePattern = SALES_STOCK_PATTERNS.INVOICE_UPDATES_STOCK,
  saleType = 'credit',
  paymentMethod = undefined,
  explicitPaymentAccountId = undefined,
  taxRate = 0.1,
  activeAllocation = false,
} = {}) {
  const company_id = 'company-1';
  const accountMap = {
    [`${company_id}:${ACCOUNT_SUBTYPES.RECEIVABLE}`]: 'acct-ar-131',
    [`${company_id}:${ACCOUNT_SUBTYPES.CASH}`]: 'acct-cash-111',
    [`${company_id}:${ACCOUNT_SUBTYPES.BANK}`]: 'acct-bank-112',
    [`${company_id}:${ACCOUNT_SUBTYPES.VAT_OUTPUT}`]: 'acct-vat-output-33311',
    [`${company_id}:${ACCOUNT_SUBTYPES.GOODS_SENT_FOR_SALE}`]: 'acct-goods-sent-157',
    [`${company_id}:${ACCOUNT_SUBTYPES.COGS}`]: 'acct-cogs-632',
    [`${company_id}:${ACCOUNT_SUBTYPES.MERCHANDISE_INVENTORY}`]: 'acct-inventory-156',
  };

  const companySettingsRepository = new InMemoryCompanySettingsRepository({
    salesStockPatternByCompany: { [company_id]: invoicePattern },
  });
  const accountSettingsRepository = new InMemoryAccountSettingsRepository({ accountByCompanyAndSubtype: accountMap });
  const accountResolver = new AccountContractResolver({ accountSettingsRepository });

  const invoice = {
    id: 'si-1',
    company_id,
    invoice_number: 'SI-2026-00001',
    status: 'draft',
    sale_type: saleType,
    stock_pattern: invoicePattern,
    customer_id: 'customer-1',
    currency: 'VND',
    due_date: '2026-07-27',
    total_amount: 1000,
    tax_amount: taxRate > 0 ? 100 : 0,
    grand_total: taxRate > 0 ? 1100 : 1000,
    payment_method: paymentMethod,
    payment_account_id: explicitPaymentAccountId,
    cash_account_id: null,
    lines: [{
      id: 'sil-1',
      item_id: 'item-1',
      warehouse_id: 'wh-1',
      quantity: 2,
      unit_price: 500,
      line_amount: 1000,
      tax_rate: taxRate,
      tax_amount: taxRate > 0 ? 100 : 0,
      revenue_account_id: 'acct-revenue-511',
    }],
  };

  const deliveryNote = {
    id: 'dn-1',
    company_id,
    delivery_number: 'DN-2026-00001',
    status: 'draft',
    customer_id: 'customer-1',
    lines: [{ id: 'dnl-1', item_id: 'item-1', warehouse_id: 'wh-1', quantity: 2 }],
  };

  const salesInvoiceRepository = new InMemorySalesInvoiceRepository([invoice]);
  const deliveryNoteRepository = new InMemoryDeliveryNoteRepository([deliveryNote]);

  const calls = { postedDocs: [], reversedDocs: [], inventoryIssues: [], inventoryReversals: [], arCreate: [], arReverse: [], vatWrite: [], vatReverse: [] };

  const service = new SalesPostingService({
    transactionManager: { withTransaction: (fn) => fn({ txId: 'tx-1' }) },
    salesInvoiceRepository,
    deliveryNoteRepository,
    companySettingsRepository,
    accountResolver,
    coreAccounting: {
      async postAccountingDocument(request) {
        calls.postedDocs.push(request);
        return { journal_entry_id: `je-${calls.postedDocs.length}` };
      },
      async reverseAccountingDocument(request) {
        calls.reversedDocs.push(request);
        return { journal_entry_id: `je-rev-${calls.reversedDocs.length}` };
      },
    },
    inventoryIssueService: {
      async postIssue(request) {
        calls.inventoryIssues.push(request);
        if (request.source_document_type === 'sales_invoice') {
          return { accounting_lines: [
            { account_id: 'acct-cogs-632', account_subtype: ACCOUNT_SUBTYPES.COGS, debit: 700, credit: 0 },
            { account_id: 'acct-inventory-156', account_subtype: ACCOUNT_SUBTYPES.MERCHANDISE_INVENTORY, debit: 0, credit: 700 },
          ] };
        }
        return {
          total_stock_value: 700,
          inventory_credit_lines: [{
            account_id: 'acct-inventory-156',
            account_subtype: ACCOUNT_SUBTYPES.MERCHANDISE_INVENTORY,
            credit: 700,
            item_id: 'item-1',
            warehouse_id: 'wh-1',
          }],
        };
      },
      async reverseIssue(request) { calls.inventoryReversals.push(request); },
    },
    arLedger: {
      async createOutstanding(request) { calls.arCreate.push(request); },
      async reverseOutstanding(request) { calls.arReverse.push(request); },
      async hasActiveAllocation() { return activeAllocation; },
    },
    taxLedger: {
      async writeVatOutput(request) { calls.vatWrite.push(request); },
      async reverseVatOutput(request) { calls.vatReverse.push(request); },
    },
  });

  return { service, calls, company_id, salesInvoiceRepository, deliveryNoteRepository };
}

test('credit sale debits frozen receivable subtype mapping', async () => {
  const { service, calls, company_id } = fixture({ saleType: 'credit' });

  await service.postSalesInvoice({ company_id, invoice_id: 'si-1', posting_date: '2026-06-27', idempotency_key: 'post-credit-si-v2' });

  const debitLine = calls.postedDocs[0].lines.find((line) => line.memo === 'Trade receivable');
  assert.equal(debitLine.account_id, 'acct-ar-131');
  assert.equal(calls.arCreate.length, 1);
});

test('cash sale debits frozen cash subtype mapping when payment method is cash', async () => {
  const { service, calls, company_id } = fixture({ saleType: 'cash', paymentMethod: PAYMENT_METHODS.CASH });

  await service.postSalesInvoice({ company_id, invoice_id: 'si-1', posting_date: '2026-06-27', idempotency_key: 'post-cash-si-v2' });

  assert.equal(calls.arCreate.length, 0);
  assert.ok(calls.postedDocs[0].lines.some((line) => line.account_id === 'acct-cash-111' && line.debit === 1100));
});

test('cash sale debits frozen bank subtype mapping when payment method is bank transfer', async () => {
  const { service, calls, company_id } = fixture({ saleType: 'cash', paymentMethod: PAYMENT_METHODS.BANK_TRANSFER });

  await service.postSalesInvoice({ company_id, invoice_id: 'si-1', posting_date: '2026-06-27', idempotency_key: 'post-bank-si-v2' });

  assert.equal(calls.arCreate.length, 0);
  assert.ok(calls.postedDocs[0].lines.some((line) => line.account_id === 'acct-bank-112' && line.debit === 1100));
});

test('cash sale accepts explicit account_id value that points to accounts.id', async () => {
  const { service, calls, company_id } = fixture({ saleType: 'cash', explicitPaymentAccountId: 'acct-bank-explicit-1121' });

  await service.postSalesInvoice({ company_id, invoice_id: 'si-1', posting_date: '2026-06-27', idempotency_key: 'post-explicit-si-v2' });

  assert.ok(calls.postedDocs[0].lines.some((line) => line.account_id === 'acct-bank-explicit-1121' && line.debit === 1100));
});

test('Sales Invoice composes VAT output GL with configured account_id and calls EW-01 postAccountingDocument', async () => {
  const { service, calls, company_id } = fixture();

  const result = await service.postSalesInvoice({
    company_id,
    invoice_id: 'si-1',
    posting_date: '2026-06-27',
    idempotency_key: 'post-si-1-v2',
  });

  assert.equal(result.status, 'posted');
  assert.equal(calls.postedDocs.length, 1);
  const request = calls.postedDocs[0];
  assert.equal(request.source_document_type, 'sales_invoice');
  assert.ok(request.lines.every((line) => line.account_id));
  const forbiddenLegacyAccountField = ['chart', 'of', 'accounts', 'id'].join('_');
  assert.ok(request.lines.every((line) => !(forbiddenLegacyAccountField in line)));
  assert.ok(request.lines.every((line) => !line._vat_output_placeholder));
  assert.deepEqual(
    request.lines.find((line) => line.memo === 'VAT output'),
    { account_id: 'acct-vat-output-33311', debit: 0, credit: 100, memo: 'VAT output', tax_direction: 'output' }
  );
  assert.equal(calls.vatWrite.length, 1);
  assert.equal(calls.vatWrite[0].vat_output_account_id, 'acct-vat-output-33311');
  assert.equal(calls.vatWrite[0].journal_entry_id, 'je-1');
});

test('invoice_updates_stock pattern calls generic inventoryIssueService.postIssue and includes cogs and merchandise_inventory lines', async () => {
  const { service, calls, company_id } = fixture({ invoicePattern: SALES_STOCK_PATTERNS.INVOICE_UPDATES_STOCK });
  await service.postSalesInvoice({ company_id, invoice_id: 'si-1', posting_date: '2026-06-27', idempotency_key: 'post-si-1-stock-v2' });

  assert.equal(calls.inventoryIssues.length, 1);
  assert.equal(calls.inventoryIssues[0].source_document_type, 'sales_invoice');
  const lines = calls.postedDocs[0].lines;
  assert.ok(lines.some((line) => line.account_id === 'acct-cogs-632' && line.account_subtype === ACCOUNT_SUBTYPES.COGS && line.debit === 700));
  assert.ok(lines.some((line) => line.account_id === 'acct-inventory-156' && line.account_subtype === ACCOUNT_SUBTYPES.MERCHANDISE_INVENTORY && line.credit === 700));
});

test('delivery_then_invoice Sales Invoice does not post inventory issue', async () => {
  const { service, calls, company_id } = fixture({ invoicePattern: SALES_STOCK_PATTERNS.DELIVERY_THEN_INVOICE });
  await service.postSalesInvoice({ company_id, invoice_id: 'si-1', posting_date: '2026-06-27', idempotency_key: 'post-si-1-delivery-v2' });

  assert.equal(calls.inventoryIssues.length, 0);
  assert.equal(calls.postedDocs.length, 1);
});

test('Delivery Note uses goods_sent_for_sale and merchandise inventory account mappings', async () => {
  const { service, calls, company_id } = fixture({ invoicePattern: SALES_STOCK_PATTERNS.DELIVERY_THEN_INVOICE });

  await service.postDeliveryNote({ company_id, delivery_note_id: 'dn-1', posting_date: '2026-06-27', idempotency_key: 'post-dn-1-v2' });

  assert.equal(calls.inventoryIssues.length, 1);
  assert.equal(calls.inventoryIssues[0].source_document_type, 'delivery_note');
  const request = calls.postedDocs[0];
  assert.equal(request.source_document_type, 'delivery_note');
  assert.ok(request.lines.some((line) => line.account_id === 'acct-goods-sent-157' && line.debit === 700));
  assert.ok(request.lines.some((line) => line.account_id === 'acct-inventory-156' && line.account_subtype === ACCOUNT_SUBTYPES.MERCHANDISE_INVENTORY && line.credit === 700));
});

test('Sales Invoice cancellation is blocked when active AR allocation exists', async () => {
  const { service, company_id, salesInvoiceRepository } = fixture({ activeAllocation: true });
  await salesInvoiceRepository.markPosted(company_id, 'si-1', { posting_date: '2026-06-27', idempotency_key: 'manual', stock_pattern: SALES_STOCK_PATTERNS.INVOICE_UPDATES_STOCK });

  await assert.rejects(
    () => service.cancelSalesInvoice({ company_id, invoice_id: 'si-1', cancellation_reason: 'test', idempotency_key: 'cancel-si-1-v2' }),
    /active payment allocation exists/
  );
});

test('static evidence: source and migrations use only frozen subtype enum values', () => {
  const root = path.resolve(__dirname, '..');
  const files = [
    ...walk(path.join(root, 'src')),
    ...walk(path.join(root, 'migrations')),
  ].filter((file) => /\.(js|sql)$/.test(file));
  const text = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  const forbiddenLegacyAccountField = ['chart', 'of', 'accounts'].join('_');
  assert.equal(new RegExp(forbiddenLegacyAccountField, 'i').test(text), false, 'legacy COA table must not be referenced');
  assert.equal(/insert\s+into\s+gl_entries/i.test(text), false, 'Sales module must not insert gl_entries directly');

  const forbiddenSubtypes = [
    ['trade', 'receivable'].join('_'),
    ['cash', 'or', 'bank'].join('_'),
    ['inventory', 'asset'].join('_'),
    ['cost', 'of', 'goods', 'sold'].join('_'),
  ];
  for (const subtype of forbiddenSubtypes) {
    assert.equal(text.includes(subtype), false, `${subtype} must not remain in source/migration files`);
  }

  assert.match(text, /receivable/);
  assert.match(text, /vat_output/);
  assert.match(text, /goods_sent_for_sale/);
  assert.match(text, /cogs/);
  assert.match(text, /merchandise_inventory/);
  assert.match(text, /postAccountingDocument/);
  assert.match(text, /reverseAccountingDocument/);
});

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
