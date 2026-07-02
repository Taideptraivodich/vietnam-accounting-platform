const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPurchaseReceiptSchema,
  createPurchaseInvoiceSchema,
  grniAccountMetadataSchema,
} = require('../src/modules/purchase/validators/purchase.validators');

const SUPPLIER_ID = '00000000-0000-0000-0000-000000000001';
const ITEM_ID = '00000000-0000-0000-0000-000000000010';
const WAREHOUSE_ID = '00000000-0000-0000-0000-000000000020';
const RECEIPT_ID = '00000000-0000-0000-0000-000000000030';
const RECEIPT_LINE_ID = '00000000-0000-0000-0000-000000000031';
const ACCOUNT_ID = '00000000-0000-0000-0000-000000000040';

test('valid purchase receipt passes', () => {
  const parsed = createPurchaseReceiptSchema.parse({
    supplier_id: SUPPLIER_ID,
    receipt_date: '2026-06-01',
    posting_date: '2026-06-01',
    lines: [{ item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 1, unit_cost: 100 }],
  });
  assert.equal(parsed.currency_code, 'VND');
});

test('receipt rejects zero quantity', () => {
  assert.throws(() => createPurchaseReceiptSchema.parse({
    supplier_id: SUPPLIER_ID,
    receipt_date: '2026-06-01',
    posting_date: '2026-06-01',
    lines: [{ item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 0, unit_cost: 100 }],
  }), /VALIDATION_ERROR/);
});

test('valid P1 direct-stock credit invoice passes without receipt links', () => {
  const parsed = createPurchaseInvoiceSchema.parse({
    supplier_id: SUPPLIER_ID,
    invoice_date: '2026-06-01',
    posting_date: '2026-06-01',
    payment_method: 'credit',
    lines: [{ item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 1, unit_price: 100, tax_rate: 10 }],
  });
  assert.equal(parsed.stock_update_pattern, 'direct_invoice_stock');
});

test('valid P2 receipt-linked cash invoice passes', () => {
  const parsed = createPurchaseInvoiceSchema.parse({
    supplier_id: SUPPLIER_ID,
    invoice_date: '2026-06-01',
    posting_date: '2026-06-01',
    payment_method: 'cash',
    lines: [{
      item_id: ITEM_ID,
      warehouse_id: WAREHOUSE_ID,
      quantity: 1,
      unit_price: 100,
      tax_rate: 10,
      purchase_receipt_id: RECEIPT_ID,
      purchase_receipt_line_id: RECEIPT_LINE_ID,
    }],
  });
  assert.equal(parsed.stock_update_pattern, 'receipt_then_invoice');
});

test('invoice rejects partial receipt links', () => {
  assert.throws(() => createPurchaseInvoiceSchema.parse({
    supplier_id: SUPPLIER_ID,
    invoice_date: '2026-06-01',
    posting_date: '2026-06-01',
    lines: [{ item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 1, unit_price: 100, purchase_receipt_id: RECEIPT_ID }],
  }), /VALIDATION_ERROR/);
});

test('invoice rejects mixed P1/P2 lines', () => {
  assert.throws(() => createPurchaseInvoiceSchema.parse({
    supplier_id: SUPPLIER_ID,
    invoice_date: '2026-06-01',
    posting_date: '2026-06-01',
    lines: [
      { item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 1, unit_price: 100 },
      { item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 1, unit_price: 100, purchase_receipt_id: RECEIPT_ID, purchase_receipt_line_id: RECEIPT_LINE_ID },
    ],
  }), /VALIDATION_ERROR/);
});

test('invoice rejects invalid payment_method and tax_rate > 100', () => {
  assert.throws(() => createPurchaseInvoiceSchema.parse({
    supplier_id: SUPPLIER_ID,
    invoice_date: '2026-06-01',
    posting_date: '2026-06-01',
    payment_method: 'card',
    lines: [{ item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 1, unit_price: 100 }],
  }), /VALIDATION_ERROR/);
  assert.throws(() => createPurchaseInvoiceSchema.parse({
    supplier_id: SUPPLIER_ID,
    invoice_date: '2026-06-01',
    posting_date: '2026-06-01',
    lines: [{ item_id: ITEM_ID, warehouse_id: WAREHOUSE_ID, quantity: 1, unit_price: 100, tax_rate: 101 }],
  }), /VALIDATION_ERROR/);
});

test('valid GRNI metadata passes and forces supplier defaults', () => {
  const parsed = grniAccountMetadataSchema.parse({ account_id: ACCOUNT_ID });
  assert.equal(parsed.default_party_type, 'supplier');
  assert.equal(parsed.requires_inventory_item, true);
  assert.equal(parsed.requires_warehouse, true);
});


test('GRNI metadata rejects non-supplier default party type', () => {
  assert.throws(() => grniAccountMetadataSchema.parse({ account_id: ACCOUNT_ID, default_party_type: 'customer' }), /VALIDATION_ERROR/);
});
