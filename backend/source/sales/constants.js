/**
 * EW-03 Sales / Delivery constants.
 *
 * Round 2 Senior P0 alignment:
 * - Use semantic stock patterns, not S1/S2 in business logic.
 * - Use canonical account reference convention: payload account_id stores accounts.id.
 * - Use frozen COA-compatible account_subtype enum values only.
 */

const SALES_STOCK_PATTERNS = Object.freeze({
  INVOICE_UPDATES_STOCK: 'invoice_updates_stock',
  DELIVERY_THEN_INVOICE: 'delivery_then_invoice',
});

const SALE_TYPES = Object.freeze({
  CREDIT: 'credit',
  CASH: 'cash',
});

const PAYMENT_METHODS = Object.freeze({
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  OTHER_BANK: 'other_bank',
});

const ACCOUNT_SUBTYPES = Object.freeze({
  RECEIVABLE: 'receivable',
  CASH: 'cash',
  BANK: 'bank',
  VAT_OUTPUT: 'vat_output',
  GOODS_SENT_FOR_SALE: 'goods_sent_for_sale',
  SALES_REVENUE: 'sales_revenue',
  MERCHANDISE_INVENTORY: 'merchandise_inventory',
  FINISHED_GOODS: 'finished_goods',
  RAW_MATERIAL: 'raw_material',
  TOOLS: 'tools',
  COGS: 'cogs',
});

const INVENTORY_ACCOUNT_SUBTYPES = Object.freeze([
  ACCOUNT_SUBTYPES.MERCHANDISE_INVENTORY,
  ACCOUNT_SUBTYPES.FINISHED_GOODS,
  ACCOUNT_SUBTYPES.RAW_MATERIAL,
  ACCOUNT_SUBTYPES.TOOLS,
]);

const BANK_PAYMENT_METHODS = Object.freeze([
  PAYMENT_METHODS.BANK_TRANSFER,
  PAYMENT_METHODS.CARD,
  PAYMENT_METHODS.OTHER_BANK,
]);

const SOURCE_DOCUMENT_TYPES = Object.freeze({
  SALES_INVOICE: 'sales_invoice',
  DELIVERY_NOTE: 'delivery_note',
});

module.exports = {
  SALES_STOCK_PATTERNS,
  SALE_TYPES,
  PAYMENT_METHODS,
  ACCOUNT_SUBTYPES,
  INVENTORY_ACCOUNT_SUBTYPES,
  BANK_PAYMENT_METHODS,
  SOURCE_DOCUMENT_TYPES,
};
