const {
  ACCOUNT_SUBTYPES,
  INVENTORY_ACCOUNT_SUBTYPES,
  BANK_PAYMENT_METHODS,
} = require('../constants');

/**
 * Resolves account configuration through the EW-01 canonical account contract.
 *
 * Physical account PK convention:
 *   accounts.id
 *
 * EW module payload/reference convention:
 *   account_id value = accounts.id
 *
 * The injected repository may resolve by frozen account_subtype and optional dimensions.
 */
class AccountContractResolver {
  constructor({ accountSettingsRepository }) {
    if (!accountSettingsRepository) throw new Error('accountSettingsRepository is required');
    this.accountSettingsRepository = accountSettingsRepository;
  }

  async resolveRequiredBySubtype(company_id, subtype, tx, dimensions = {}) {
    const mapping = await this.accountSettingsRepository.findBySubtype(company_id, subtype, tx, dimensions);
    if (!mapping || !mapping.account_id) {
      throw new Error(`Missing account mapping for subtype ${subtype}`);
    }
    if (mapping.subtype && mapping.subtype !== subtype) {
      throw new Error(`Account mapping subtype mismatch: expected ${subtype}, got ${mapping.subtype}`);
    }
    return mapping.account_id;
  }

  resolveReceivableAccount(company_id, tx) {
    return this.resolveRequiredBySubtype(company_id, ACCOUNT_SUBTYPES.RECEIVABLE, tx);
  }

  async resolveCashOrBankAccount(invoice, tx) {
    if (invoice.cash_account_id) return invoice.cash_account_id;
    if (invoice.payment_account_id) return invoice.payment_account_id;

    const subtype = resolvePaymentAccountSubtype(invoice.payment_method);
    return this.resolveRequiredBySubtype(invoice.company_id, subtype, tx, {
      payment_method: invoice.payment_method,
    });
  }

  // Backward-compatible method name used by existing SalesPostingService call sites.
  resolveCashAccount(invoice, tx) {
    return this.resolveCashOrBankAccount(invoice, tx);
  }

  resolveVatOutputAccount(company_id, tx) {
    return this.resolveRequiredBySubtype(company_id, ACCOUNT_SUBTYPES.VAT_OUTPUT, tx);
  }

  resolveGoodsSentForSaleAccount(company_id, tx) {
    return this.resolveRequiredBySubtype(company_id, ACCOUNT_SUBTYPES.GOODS_SENT_FOR_SALE, tx);
  }

  resolveCogsAccount(company_id, tx, dimensions = {}) {
    return this.resolveRequiredBySubtype(company_id, ACCOUNT_SUBTYPES.COGS, tx, dimensions);
  }

  async resolveInventoryAccount(company_id, tx, dimensions = {}) {
    if (typeof this.accountSettingsRepository.resolveInventoryAccount === 'function') {
      const mapping = await this.accountSettingsRepository.resolveInventoryAccount(company_id, dimensions, tx);
      if (!mapping || !mapping.account_id) throw new Error('Missing inventory account mapping');
      if (mapping.subtype && !INVENTORY_ACCOUNT_SUBTYPES.includes(mapping.subtype)) {
        throw new Error(`Invalid inventory account subtype: ${mapping.subtype}`);
      }
      return mapping.account_id;
    }

    const subtype = dimensions.inventory_account_subtype || ACCOUNT_SUBTYPES.MERCHANDISE_INVENTORY;
    if (!INVENTORY_ACCOUNT_SUBTYPES.includes(subtype)) {
      throw new Error(`Invalid inventory account subtype: ${subtype}`);
    }
    return this.resolveRequiredBySubtype(company_id, subtype, tx, dimensions);
  }
}

function resolvePaymentAccountSubtype(payment_method) {
  return BANK_PAYMENT_METHODS.includes(payment_method)
    ? ACCOUNT_SUBTYPES.BANK
    : ACCOUNT_SUBTYPES.CASH;
}

module.exports = { AccountContractResolver, resolvePaymentAccountSubtype };
