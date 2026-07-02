const { normalizeSalesInvoiceDraft } = require('../models/SalesInvoice');

class SalesInvoiceService {
  constructor({ salesInvoiceRepository, companySettingsRepository }) {
    if (!salesInvoiceRepository) throw new Error('salesInvoiceRepository is required');
    if (!companySettingsRepository) throw new Error('companySettingsRepository is required');
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.companySettingsRepository = companySettingsRepository;
  }

  async createDraft(company_id, payload, tx) {
    const companySalesStockPattern = await this.companySettingsRepository.getSalesStockPattern(company_id, tx);
    if (!companySalesStockPattern) throw new Error('Company sales_stock_pattern setting is required');
    const invoice = normalizeSalesInvoiceDraft({ ...payload, company_id }, companySalesStockPattern);
    return this.salesInvoiceRepository.createDraft(invoice, tx);
  }

  list(company_id, filters, tx) {
    return this.salesInvoiceRepository.list(company_id, filters || {}, tx);
  }

  get(company_id, id, tx) {
    return this.salesInvoiceRepository.findWithLines(company_id, id, tx);
  }
}

module.exports = { SalesInvoiceService };
