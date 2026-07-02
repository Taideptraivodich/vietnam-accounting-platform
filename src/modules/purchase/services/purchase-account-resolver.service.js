/**
 * EW-04 — Purchase Account Resolver
 * Architecture Freeze v1.0 / Round 2 P0 revision
 *
 * Contract convention:
 * - Physical account PK is EW-01 `accounts.id`.
 * - Business payload/account-reference field is named `account_id` and stores `accounts.id`.
 * - EW-04 never assumes a physical account-id alias column.
 */

const INVENTORY_SUBTYPES = [
  'raw_material',
  'tools',
  'finished_goods',
  'merchandise_inventory',
];

const REQUIRED_ACCOUNT_SUBTYPES = Object.freeze({
  inventory: INVENTORY_SUBTYPES,
  grni: ['goods_received_not_invoiced'],
  payable: ['payable'],
  vatInput: ['vat_input'],
  cash: ['cash'],
  bank: ['bank'],
});

class PurchaseAccountResolver {
  constructor({ db }) {
    this.db = db;
  }

  async resolveReceiptPostingAccounts(companyId, receipt, inventoryResult, trx) {
    const lineAccounts = new Map();
    for (const lineResult of inventoryResult.lineResults || []) {
      const receiptLine = (receipt.lines || []).find((l) => l.id === lineResult.receipt_line_id) || {};
      const inventoryAccount = await this.resolveInventoryAccount(companyId, {
        itemId: receiptLine.item_id,
        warehouseId: receiptLine.warehouse_id,
        providedAccountId: lineResult.inventory_account_id,
        trx,
      });
      const grniAccount = await this.resolveGRNIAccount(companyId, {
        supplierId: receipt.supplier_id,
        itemId: receiptLine.item_id,
        warehouseId: receiptLine.warehouse_id,
        providedAccountId: lineResult.grni_account_id,
        trx,
      });
      lineAccounts.set(lineResult.receipt_line_id, {
        inventory_account_id: inventoryAccount.account_id,
        grni_account_id: grniAccount.account_id,
        inventory_account_subtype: inventoryAccount.account_subtype,
        grni_account_subtype: grniAccount.account_subtype,
      });
    }
    return { lineAccounts };
  }

  async resolveInvoicePostingAccounts(companyId, invoice, { inventoryResult = null, isP2, isDirectCash }, trx) {
    const lineAccounts = new Map();

    if (isP2) {
      for (const line of invoice.lines || []) {
        if (!line.purchase_receipt_id) continue;
        const grniAccount = await this.resolveGRNIAccount(companyId, {
          supplierId: invoice.supplier_id,
          itemId: line.item_id,
          warehouseId: line.warehouse_id,
          providedAccountId: line.grni_account_id || null,
          trx,
        });
        lineAccounts.set(line.id, {
          grni_account_id: grniAccount.account_id,
          grni_account_subtype: grniAccount.account_subtype,
        });
      }
    } else if (inventoryResult) {
      for (const lineResult of inventoryResult.lineResults || []) {
        const invoiceLineId = this._getInventoryLineInvoiceLineId(lineResult);
        const invoiceLine = (invoice.lines || []).find((l) => l.id === invoiceLineId) || {};
        const inventoryAccount = await this.resolveInventoryAccount(companyId, {
          itemId: invoiceLine.item_id,
          warehouseId: invoiceLine.warehouse_id,
          providedAccountId: lineResult.inventory_account_id,
          trx,
        });
        lineAccounts.set(invoiceLineId, {
          inventory_account_id: inventoryAccount.account_id,
          inventory_account_subtype: inventoryAccount.account_subtype,
        });
      }
    }

    const vatInputAccount = Number(invoice.tax_amount || 0) > 0
      ? await this.resolveVATInputAccount(companyId, { trx })
      : null;

    const settlementAccount = isDirectCash
      ? await this.resolveCashBankAccount(companyId, {
          paymentMethod: invoice.payment_method,
          providedAccountId: invoice.cash_bank_account_id || null,
          trx,
        })
      : await this.resolvePayableAccount(companyId, {
          providedAccountId: invoice.ap_account_id || null,
          trx,
        });

    return {
      lineAccounts,
      vat_input_account_id: vatInputAccount?.account_id || null,
      vat_input_account_subtype: vatInputAccount?.account_subtype || null,
      settlement_account_id: settlementAccount.account_id,
      settlement_account_subtype: settlementAccount.account_subtype,
      settlement_kind: isDirectCash ? invoice.payment_method : 'payable',
    };
  }

  async resolveInventoryAccount(companyId, { itemId, warehouseId, providedAccountId, trx }) {
    return this._resolveAccount(companyId, {
      purpose: 'purchase inventory',
      mappingKey: 'purchase.inventory',
      accountSubtypes: REQUIRED_ACCOUNT_SUBTYPES.inventory,
      providedAccountId,
      context: { item_id: itemId, warehouse_id: warehouseId },
      trx,
    });
  }

  async resolveGRNIAccount(companyId, { supplierId, itemId, warehouseId, providedAccountId, trx }) {
    const account = await this._resolveAccount(companyId, {
      purpose: 'GRNI clearing',
      mappingKey: 'purchase.grni',
      accountSubtypes: REQUIRED_ACCOUNT_SUBTYPES.grni,
      providedAccountId,
      context: { party_id: supplierId, item_id: itemId, warehouse_id: warehouseId },
      trx,
    });

    this._assertNotTK151(account);

    // If EW-04 GRNI metadata table exists, enforce its posting metadata guardrails.
    const meta = await this._getGRNIMetadataIfAvailable(companyId, account.account_id, trx);
    if (meta) this.assertGRNIMetadata(meta);

    return account;
  }

  async resolvePayableAccount(companyId, { providedAccountId, trx }) {
    return this._resolveAccount(companyId, {
      purpose: 'accounts payable',
      mappingKey: 'purchase.payable',
      accountSubtypes: REQUIRED_ACCOUNT_SUBTYPES.payable,
      providedAccountId,
      trx,
    });
  }

  async resolveVATInputAccount(companyId, { providedAccountId, trx } = {}) {
    return this._resolveAccount(companyId, {
      purpose: 'VAT input',
      mappingKey: 'purchase.vat_input',
      accountSubtypes: REQUIRED_ACCOUNT_SUBTYPES.vatInput,
      providedAccountId,
      trx,
    });
  }

  async resolveCashBankAccount(companyId, { paymentMethod, providedAccountId, trx }) {
    if (!['cash', 'bank'].includes(paymentMethod)) {
      throw new Error(`INVALID_PAYMENT_METHOD: ${paymentMethod} is not a direct cash/bank method`);
    }
    return this._resolveAccount(companyId, {
      purpose: `${paymentMethod} settlement`,
      mappingKey: `purchase.${paymentMethod}`,
      accountSubtypes: REQUIRED_ACCOUNT_SUBTYPES[paymentMethod],
      providedAccountId,
      trx,
    });
  }

  assertNoMissingAccountIds(glLines, source) {
    const missing = [];
    glLines.forEach((line, index) => {
      if (!line.account_id) missing.push(`#${index + 1}`);
    });
    if (missing.length) {
      throw new Error(
        `ACCOUNT_RESOLUTION_FAILED: ${source} has GL lines without account_id: ${missing.join(', ')}`
      );
    }
  }

  assertGRNIMetadata(meta) {
    const errors = [];
    if (meta.account_subtype !== 'goods_received_not_invoiced') {
      errors.push('account_subtype must be goods_received_not_invoiced');
    }
    if (meta.requires_party !== true) errors.push('requires_party must be true');
    if (meta.default_party_type !== 'supplier') errors.push('default_party_type must be supplier');
    if (meta.requires_inventory_item !== true) errors.push('requires_inventory_item must be true');
    if (meta.requires_warehouse !== true) errors.push('requires_warehouse must be true');
    if (errors.length) throw new Error(`GRNI_METADATA_INVALID: ${errors.join('; ')}`);
  }

  async _resolveAccount(companyId, { purpose, mappingKey, accountSubtypes, providedAccountId, context = {}, trx }) {
    const knex = trx || this.db;

    if (providedAccountId) {
      const account = await this._getAccountById(companyId, providedAccountId, knex);
      this._assertSubtype(account, accountSubtypes, purpose);
      return account;
    }

    const mappedAccount = await this._resolveFromAccountMapping(companyId, mappingKey, accountSubtypes, context, knex);
    if (mappedAccount) return mappedAccount;

    const accounts = await knex('accounts')
      .where({ company_id: companyId })
      .whereIn('account_subtype', accountSubtypes)
      .select({ account_id: 'id', account_code: 'code', account_name: 'name' }, 'account_type', 'account_subtype')
      .limit(2);

    if (!accounts || accounts.length === 0) {
      throw new Error(
        `ACCOUNT_MAPPING_NOT_FOUND: Cannot resolve ${purpose} account for company ${companyId}. ` +
        `Expected accounts.account_subtype in [${accountSubtypes.join(', ')}].`
      );
    }
    if (accounts.length > 1) {
      throw new Error(
        `ACCOUNT_MAPPING_AMBIGUOUS: Multiple ${purpose} accounts found for company ${companyId}. ` +
        `Configure account_mappings mapping_key=${mappingKey}.`
      );
    }
    return accounts[0];
  }

  async _getAccountById(companyId, accountId, knex) {
    const account = await knex('accounts')
      .where({ company_id: companyId, id: accountId })
      .select({ account_id: 'id', account_code: 'code', account_name: 'name' }, 'account_type', 'account_subtype')
      .first();
    if (!account) {
      throw new Error(`ACCOUNT_NOT_FOUND: accounts.id=${accountId} not found for company ${companyId}`);
    }
    return account;
  }

  async _resolveFromAccountMapping(companyId, mappingKey, accountSubtypes, context, knex) {
    const hasMappingTable = await this._hasTable('account_mappings');
    if (!hasMappingTable) return null;

    const mappings = await knex('account_mappings')
      .where({ company_id: companyId, mapping_key: mappingKey })
      .select('account_id')
      .limit(2);

    // `account_mappings.account_id` is a business/reference field
    // whose value is the physical EW-01 `accounts.id`.
    if (!mappings || mappings.length === 0) return null;
    if (mappings.length > 1) {
      throw new Error(`ACCOUNT_MAPPING_AMBIGUOUS: Multiple account_mappings rows for ${mappingKey}`);
    }

    const account = await this._getAccountById(companyId, mappings[0].account_id, knex);
    this._assertSubtype(account, accountSubtypes, mappingKey);
    return account;
  }

  async _getGRNIMetadataIfAvailable(companyId, accountId, knex) {
    const executor = knex || this.db;
    const hasTable = await this._hasTable('grni_account_metadata');
    if (!hasTable) return null;
    return executor('grni_account_metadata')
      .where({ company_id: companyId, account_id: accountId })
      .first();
  }

  async _hasTable(tableName) {
    if (!this.db.schema || typeof this.db.schema.hasTable !== 'function') return false;
    try {
      return await this.db.schema.hasTable(tableName);
    } catch (_err) {
      return false;
    }
  }

  _getInventoryLineInvoiceLineId(lineResult) {
    return lineResult.invoice_line_id || lineResult.source_document_line_id || lineResult.line_id || lineResult.receipt_line_id;
  }

  _assertSubtype(account, allowedSubtypes, purpose) {
    if (!account || !account.account_id) {
      throw new Error(`ACCOUNT_RESOLUTION_FAILED: ${purpose} account is empty`);
    }
    if (!allowedSubtypes.includes(account.account_subtype)) {
      throw new Error(
        `ACCOUNT_SUBTYPE_INVALID: ${purpose} account ${account.account_id} has subtype ` +
        `${account.account_subtype}; expected one of [${allowedSubtypes.join(', ')}]`
      );
    }
  }

  _assertNotTK151(account) {
    const code = String(account.account_code || '').trim();
    if (code === '151' || code.startsWith('151')) {
      throw new Error(
        'INVALID: GRNI cannot be mapped to TK 151. ' +
        'GRNI must be a liability/payable clearing account with supplier/item/warehouse metadata.'
      );
    }
  }
}

module.exports = {
  PurchaseAccountResolver,
  REQUIRED_ACCOUNT_SUBTYPES,
};
