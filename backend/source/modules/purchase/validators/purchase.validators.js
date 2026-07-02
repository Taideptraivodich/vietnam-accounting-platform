/**
 * EW-04 — Purchase / GRNI Baseline Validators
 * Architecture Freeze v1.0 / Round 2 P0 revision
 *
 * Dependency-free validator shape intentionally mirrors the prior Zod `.parse()` API
 * so the submitted package can run with Node's built-in test runner.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class ValidationError extends Error {
  constructor(errors) {
    super('VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

function fail(path, message) {
  throw new ValidationError([{ path, message }]);
}

function requireUuid(value, path) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) fail(path, 'Invalid UUID');
  return value;
}

function optionalUuid(value, path) {
  if (value === undefined || value === null || value === '') return undefined;
  return requireUuid(value, path);
}

function requireDate(value, path) {
  if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(path, 'Invalid date; expected YYYY-MM-DD');
  }
  return value;
}

function optionalDate(value, path) {
  if (value === undefined || value === null || value === '') return undefined;
  return requireDate(value, path);
}

function optionalString(value) {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function numberValue(value, path, { minExclusive = null, minInclusive = null, maxInclusive = null } = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) fail(path, 'Expected number');
  if (minExclusive !== null && !(value > minExclusive)) fail(path, `Must be > ${minExclusive}`);
  if (minInclusive !== null && !(value >= minInclusive)) fail(path, `Must be >= ${minInclusive}`);
  if (maxInclusive !== null && !(value <= maxInclusive)) fail(path, `Must be <= ${maxInclusive}`);
  return value;
}

function parsePurchaseInvoiceLine(line, index) {
  if (!line || typeof line !== 'object') fail(`lines.${index}`, 'Expected object');
  const purchaseReceiptId = optionalUuid(line.purchase_receipt_id, `lines.${index}.purchase_receipt_id`);
  const purchaseReceiptLineId = optionalUuid(line.purchase_receipt_line_id, `lines.${index}.purchase_receipt_line_id`);

  return {
    item_id: requireUuid(line.item_id, `lines.${index}.item_id`),
    warehouse_id: requireUuid(line.warehouse_id, `lines.${index}.warehouse_id`),
    description: optionalString(line.description),
    quantity: numberValue(line.quantity, `lines.${index}.quantity`, { minExclusive: 0 }),
    unit_price: numberValue(line.unit_price, `lines.${index}.unit_price`, { minInclusive: 0 }),
    tax_rate: line.tax_rate === undefined ? 0 : numberValue(line.tax_rate, `lines.${index}.tax_rate`, { minInclusive: 0, maxInclusive: 100 }),
    // Optional because EW-04 Round 2 supports both patterns:
    // P1 direct invoice stock update: no receipt link
    // P2 receipt-before-invoice: both receipt links required
    purchase_receipt_id: purchaseReceiptId,
    purchase_receipt_line_id: purchaseReceiptLineId,
  };
}

function assertConsistentPurchaseInvoicePattern(lines) {
  const hasBoth = lines.map((line) => Boolean(line.purchase_receipt_id && line.purchase_receipt_line_id));
  const hasAny = lines.map((line) => Boolean(line.purchase_receipt_id || line.purchase_receipt_line_id));

  if (hasAny.some(Boolean) && !hasBoth.every(Boolean)) {
    fail('lines', 'P2 receipt-before-invoice lines must include both purchase_receipt_id and purchase_receipt_line_id');
  }

  const allP1 = hasAny.every((v) => !v);
  const allP2 = hasBoth.every(Boolean);
  if (!allP1 && !allP2) {
    fail('lines', 'Do not mix P1 direct stock invoice lines with P2 receipt-linked invoice lines in one Purchase Invoice');
  }

  return allP2 ? 'receipt_then_invoice' : 'direct_invoice_stock';
}

const createPurchaseInvoiceSchema = {
  parse(payload) {
    if (!payload || typeof payload !== 'object') fail('payload', 'Expected object');
    if (!Array.isArray(payload.lines) || payload.lines.length < 1) fail('lines', 'At least one line is required');
    const lines = payload.lines.map(parsePurchaseInvoiceLine);
    const stockUpdatePattern = assertConsistentPurchaseInvoicePattern(lines);
    const paymentMethod = payload.payment_method || 'credit';
    if (!['credit', 'cash', 'bank'].includes(paymentMethod)) fail('payment_method', 'Expected credit, cash, or bank');

    return {
      supplier_id: requireUuid(payload.supplier_id, 'supplier_id'),
      invoice_number: optionalString(payload.invoice_number),
      invoice_date: requireDate(payload.invoice_date, 'invoice_date'),
      posting_date: requireDate(payload.posting_date, 'posting_date'),
      due_date: optionalDate(payload.due_date, 'due_date'),
      payment_method: paymentMethod,
      cash_bank_account_id: optionalUuid(payload.cash_bank_account_id, 'cash_bank_account_id'),
      currency_code: payload.currency_code || 'VND',
      notes: optionalString(payload.notes),
      idempotency_key: optionalString(payload.idempotency_key),
      stock_update_pattern: stockUpdatePattern,
      lines,
    };
  },
};

function parsePurchaseReceiptLine(line, index) {
  if (!line || typeof line !== 'object') fail(`lines.${index}`, 'Expected object');
  return {
    item_id: requireUuid(line.item_id, `lines.${index}.item_id`),
    warehouse_id: requireUuid(line.warehouse_id, `lines.${index}.warehouse_id`),
    description: optionalString(line.description),
    quantity: numberValue(line.quantity, `lines.${index}.quantity`, { minExclusive: 0 }),
    unit_cost: numberValue(line.unit_cost, `lines.${index}.unit_cost`, { minInclusive: 0 }),
  };
}

const createPurchaseReceiptSchema = {
  parse(payload) {
    if (!payload || typeof payload !== 'object') fail('payload', 'Expected object');
    if (!Array.isArray(payload.lines) || payload.lines.length < 1) fail('lines', 'At least one line is required');
    return {
      supplier_id: requireUuid(payload.supplier_id, 'supplier_id'),
      receipt_number: optionalString(payload.receipt_number),
      receipt_date: requireDate(payload.receipt_date, 'receipt_date'),
      posting_date: requireDate(payload.posting_date, 'posting_date'),
      currency_code: payload.currency_code || 'VND',
      notes: optionalString(payload.notes),
      idempotency_key: optionalString(payload.idempotency_key),
      lines: payload.lines.map(parsePurchaseReceiptLine),
    };
  },
};

const grniAccountMetadataSchema = {
  parse(payload) {
    if (!payload || typeof payload !== 'object') fail('payload', 'Expected object');
    const defaultPartyType = payload.default_party_type || 'supplier';
    if (defaultPartyType !== 'supplier') fail('default_party_type', 'GRNI default_party_type must be supplier');
    return {
      account_id: requireUuid(payload.account_id, 'account_id'),
      requires_party: payload.requires_party === undefined ? true : Boolean(payload.requires_party),
      default_party_type: defaultPartyType,
      requires_inventory_item: payload.requires_inventory_item === undefined ? true : Boolean(payload.requires_inventory_item),
      requires_warehouse: payload.requires_warehouse === undefined ? true : Boolean(payload.requires_warehouse),
    };
  },
};

module.exports = {
  ValidationError,
  createPurchaseInvoiceSchema,
  createPurchaseReceiptSchema,
  grniAccountMetadataSchema,
};
