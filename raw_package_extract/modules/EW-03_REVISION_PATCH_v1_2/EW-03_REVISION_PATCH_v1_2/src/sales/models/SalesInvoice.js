const { SALES_STOCK_PATTERNS, SALE_TYPES, PAYMENT_METHODS } = require('../constants');

function asNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${field} must be a finite number`);
  return n;
}

function round4(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}

function validateSalesStockPattern(stockPattern) {
  if (!Object.values(SALES_STOCK_PATTERNS).includes(stockPattern)) {
    throw new Error(`stock_pattern must be one of: ${Object.values(SALES_STOCK_PATTERNS).join(', ')}`);
  }
}

function validateSalesInvoiceDraft(input) {
  if (!input || typeof input !== 'object') throw new Error('Sales Invoice payload is required');
  if (!input.company_id) throw new Error('company_id is required');
  if (!input.customer_id) throw new Error('customer_id is required');

  const saleType = input.sale_type || SALE_TYPES.CREDIT;
  if (!Object.values(SALE_TYPES).includes(saleType)) throw new Error('sale_type must be credit or cash');
  if (saleType === SALE_TYPES.CASH && !input.cash_account_id && !input.payment_account_id && !input.payment_method) {
    throw new Error('cash sales require cash_account_id, payment_account_id, or payment_method');
  }
  if (input.payment_method && !Object.values(PAYMENT_METHODS).includes(input.payment_method)) {
    throw new Error(`payment_method must be one of: ${Object.values(PAYMENT_METHODS).join(', ')}`);
  }

  if (input.stock_pattern) validateSalesStockPattern(input.stock_pattern);
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new Error('at least one invoice line is required');

  input.lines.forEach((line, idx) => {
    const prefix = `lines[${idx}]`;
    if (!line.item_id) throw new Error(`${prefix}.item_id is required`);
    if (!line.warehouse_id) throw new Error(`${prefix}.warehouse_id is required`);
    if (!line.revenue_account_id) throw new Error(`${prefix}.revenue_account_id is required`);
    const forbiddenLegacyAccountField = ['chart', 'of', 'accounts', 'id'].join('_');
    if (forbiddenLegacyAccountField in line) throw new Error(`${prefix}: legacy account field is not allowed; use revenue_account_id/account_id`);

    const quantity = asNumber(line.quantity, `${prefix}.quantity`);
    const unitPrice = asNumber(line.unit_price, `${prefix}.unit_price`);
    const taxRate = asNumber(line.tax_rate || 0, `${prefix}.tax_rate`);
    if (quantity <= 0) throw new Error(`${prefix}.quantity must be > 0`);
    if (unitPrice < 0) throw new Error(`${prefix}.unit_price must be >= 0`);
    if (taxRate < 0) throw new Error(`${prefix}.tax_rate must be >= 0`);
  });
}

function computeSalesInvoiceTotals(lines) {
  const computedLines = lines.map((line, index) => {
    const quantity = asNumber(line.quantity, `lines[${index}].quantity`);
    const unitPrice = asNumber(line.unit_price, `lines[${index}].unit_price`);
    const taxRate = asNumber(line.tax_rate || 0, `lines[${index}].tax_rate`);
    const lineAmount = round4(quantity * unitPrice);
    const taxAmount = round4(lineAmount * taxRate);
    return {
      ...line,
      line_number: line.line_number || index + 1,
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      line_amount: lineAmount,
      tax_amount: taxAmount,
    };
  });

  const total_amount = round4(computedLines.reduce((sum, line) => sum + line.line_amount, 0));
  const tax_amount = round4(computedLines.reduce((sum, line) => sum + line.tax_amount, 0));
  const grand_total = round4(total_amount + tax_amount);

  return { lines: computedLines, total_amount, tax_amount, grand_total };
}

function normalizeSalesInvoiceDraft(input, companySalesStockPattern) {
  validateSalesInvoiceDraft(input);
  const stockPattern = input.stock_pattern || companySalesStockPattern;
  validateSalesStockPattern(stockPattern);
  const totals = computeSalesInvoiceTotals(input.lines);

  return {
    ...input,
    sale_type: input.sale_type || SALE_TYPES.CREDIT,
    currency: input.currency || 'VND',
    status: input.status || 'draft',
    stock_pattern: stockPattern,
    total_amount: totals.total_amount,
    tax_amount: totals.tax_amount,
    grand_total: totals.grand_total,
    lines: totals.lines,
  };
}

module.exports = {
  round4,
  validateSalesStockPattern,
  validateSalesInvoiceDraft,
  computeSalesInvoiceTotals,
  normalizeSalesInvoiceDraft,
};
