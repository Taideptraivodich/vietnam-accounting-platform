const { normalizeSalesInvoiceDraft } = require('../models/SalesInvoice');
const { normalizeDeliveryNoteDraft } = require('../models/DeliveryNote');

let seq = 0;
function nextId(prefix) {
  seq += 1;
  return `${prefix}-${seq}`;
}

class InMemoryCompanySettingsRepository {
  constructor({ salesStockPatternByCompany = {} } = {}) {
    this.salesStockPatternByCompany = { ...salesStockPatternByCompany };
  }
  async getSalesStockPattern(company_id) {
    return this.salesStockPatternByCompany[company_id];
  }
}

class InMemoryAccountSettingsRepository {
  constructor({ accountByCompanyAndSubtype = {} } = {}) {
    this.accountByCompanyAndSubtype = accountByCompanyAndSubtype;
  }
  async findBySubtype(company_id, subtype) {
    const account_id = this.accountByCompanyAndSubtype[`${company_id}:${subtype}`];
    return account_id ? { account_id, subtype } : null;
  }
}

class InMemorySalesInvoiceRepository {
  constructor(initialInvoices = []) {
    this.invoices = new Map();
    for (const invoice of initialInvoices) this.invoices.set(invoice.id, clone(invoice));
  }
  async createDraft(input) {
    const invoice = normalizeSalesInvoiceDraft(input, input.stock_pattern);
    invoice.id = invoice.id || nextId('si');
    invoice.invoice_number = invoice.invoice_number || `SI-${invoice.id}`;
    invoice.lines = invoice.lines.map((line) => ({ ...line, id: line.id || nextId('sil') }));
    this.invoices.set(invoice.id, clone(invoice));
    return clone(invoice);
  }
  async list(company_id, filters = {}) {
    return [...this.invoices.values()].filter((inv) => inv.company_id === company_id && (!filters.status || inv.status === filters.status)).map(clone);
  }
  async findWithLines(company_id, id) {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.company_id !== company_id) return null;
    return clone(invoice);
  }
  async markPosted(company_id, id, patch) {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.company_id !== company_id) throw new Error('Sales Invoice not found');
    Object.assign(invoice, patch, { status: 'posted', posted_at: new Date().toISOString() });
    return clone(invoice);
  }
  async markCancelled(company_id, id, patch) {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.company_id !== company_id) throw new Error('Sales Invoice not found');
    Object.assign(invoice, patch, { status: 'cancelled', cancelled_at: new Date().toISOString() });
    return clone(invoice);
  }
  async isLinkedInvoicePosted(company_id, delivery_note_id) {
    return [...this.invoices.values()].some((inv) => inv.company_id === company_id && inv.delivery_note_id === delivery_note_id && inv.status === 'posted');
  }
}

class InMemoryDeliveryNoteRepository {
  constructor(initialDeliveryNotes = []) {
    this.deliveryNotes = new Map();
    for (const dn of initialDeliveryNotes) this.deliveryNotes.set(dn.id, clone(dn));
  }
  async createDraft(input) {
    const dn = normalizeDeliveryNoteDraft(input);
    dn.id = dn.id || nextId('dn');
    dn.delivery_number = dn.delivery_number || `DN-${dn.id}`;
    dn.lines = dn.lines.map((line) => ({ ...line, id: line.id || nextId('dnl') }));
    this.deliveryNotes.set(dn.id, clone(dn));
    return clone(dn);
  }
  async list(company_id, filters = {}) {
    return [...this.deliveryNotes.values()].filter((dn) => dn.company_id === company_id && (!filters.status || dn.status === filters.status)).map(clone);
  }
  async findWithLines(company_id, id) {
    const dn = this.deliveryNotes.get(id);
    if (!dn || dn.company_id !== company_id) return null;
    return clone(dn);
  }
  async markPosted(company_id, id, patch) {
    const dn = this.deliveryNotes.get(id);
    if (!dn || dn.company_id !== company_id) throw new Error('Delivery Note not found');
    Object.assign(dn, patch, { status: 'posted', posted_at: new Date().toISOString() });
    return clone(dn);
  }
  async markCancelled(company_id, id, patch) {
    const dn = this.deliveryNotes.get(id);
    if (!dn || dn.company_id !== company_id) throw new Error('Delivery Note not found');
    Object.assign(dn, patch, { status: 'cancelled', cancelled_at: new Date().toISOString() });
    return clone(dn);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  InMemoryCompanySettingsRepository,
  InMemoryAccountSettingsRepository,
  InMemorySalesInvoiceRepository,
  InMemoryDeliveryNoteRepository,
};
