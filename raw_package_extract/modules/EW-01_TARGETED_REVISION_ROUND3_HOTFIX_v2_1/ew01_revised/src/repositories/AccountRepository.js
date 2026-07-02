'use strict';

/**
 * AccountRepository — read access to canonical `accounts` table and the
 * EW-01 account resolver contract used by Sales, Purchase, VAT, Inventory,
 * and AR/AP modules.
 *
 * Physical schema rule:
 * - `accounts.id` is the only physical account primary key.
 * - payload/reference fields are named `account_id` and store `accounts.id`.
 * - no physical `accounts.account_id` column is exposed or required.
 */
class AccountRepository {
  constructor(db) {
    this.db = db;
  }

  _client(tx) {
    return tx || this.db;
  }

  _asResolvedAccount(account) {
    if (!account) return null;
    return {
      ...account,
      // Virtual payload alias only. This is NOT a physical accounts.account_id column.
      account_id: account.id,
    };
  }

  async findById(companyId, accountId, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM accounts
       WHERE company_id = $1 AND id = $2 AND is_active = TRUE`,
      [companyId, accountId]
    );
    return rows[0] || null;
  }

  async findByCode(companyId, code, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM accounts
       WHERE company_id = $1 AND code = $2 AND is_active = TRUE`,
      [companyId, code]
    );
    return rows[0] || null;
  }

  async findBySubtype(companyId, accountSubtype, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM accounts
       WHERE company_id = $1
         AND account_subtype = $2
         AND is_active = TRUE
         AND is_postable = TRUE
       ORDER BY code
       LIMIT 1`,
      [companyId, accountSubtype]
    );
    return rows[0] || null;
  }

  /**
   * General resolver. Optional dimensions are used by the account_mappings
   * contract when present, then EW-01 falls back to a company default account
   * with matching account_subtype.
   */
  async resolveAccountBySubtype(companyId, accountSubtype, dimensions = {}, tx) {
    const explicitAccountId = dimensions.explicit_account_id || dimensions.account_id || null;
    if (explicitAccountId) {
      const account = await this.findById(companyId, explicitAccountId, tx);
      if (!account) return null;
      if (accountSubtype && account.account_subtype !== accountSubtype) return null;
      return this._asResolvedAccount(account);
    }

    const mapped = await this._findMappedAccount(companyId, accountSubtype, dimensions, tx);
    if (mapped) return this._asResolvedAccount(mapped);

    return this._asResolvedAccount(await this.findBySubtype(companyId, accountSubtype, tx));
  }

  async resolveCashOrBank(companyId, paymentMethod, explicitAccountId, tx) {
    if (explicitAccountId) {
      const account = await this.findById(companyId, explicitAccountId, tx);
      if (!account || !['cash', 'bank'].includes(account.account_subtype)) return null;
      return this._asResolvedAccount(account);
    }

    const normalized = String(paymentMethod || '').toLowerCase();
    const subtype = /bank|transfer|wire|card|qr|pos|vietqr/.test(normalized) ? 'bank' : 'cash';
    return this.resolveAccountBySubtype(companyId, subtype, { payment_method: paymentMethod }, tx);
  }

  async resolveInventoryAccount(companyId, itemId, warehouseId, tx) {
    const dimensions = { item_id: itemId || null, warehouse_id: warehouseId || null };
    const subtypes = ['merchandise_inventory', 'finished_goods', 'raw_material', 'tools'];
    for (const subtype of subtypes) {
      const account = await this.resolveAccountBySubtype(companyId, subtype, dimensions, tx);
      if (account) return account;
    }
    return null;
  }

  async resolveVatInputAccount(companyId, tx) {
    return this.resolveAccountBySubtype(companyId, 'vat_input', {}, tx);
  }

  async resolveVatOutputAccount(companyId, tx) {
    return this.resolveAccountBySubtype(companyId, 'vat_output', {}, tx);
  }

  async resolveGoodsSentForSaleAccount(companyId, tx) {
    return this.resolveAccountBySubtype(companyId, 'goods_sent_for_sale', {}, tx);
  }

  async resolveGRNIAccount(companyId, supplierId, itemId, warehouseId, tx) {
    return this.resolveAccountBySubtype(companyId, 'goods_received_not_invoiced', {
      party_type: 'SUPPLIER',
      party_id: supplierId || null,
      item_id: itemId || null,
      warehouse_id: warehouseId || null,
    }, tx);
  }

  async _findMappedAccount(companyId, accountSubtype, dimensions = {}, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT a.*
       FROM account_mappings m
       JOIN accounts a ON a.id = m.account_id AND a.company_id = m.company_id
       WHERE m.company_id = $1
         AND m.account_subtype = $2
         AND m.is_active = TRUE
         AND a.is_active = TRUE
         AND a.is_postable = TRUE
         AND (m.payment_method IS NULL OR m.payment_method = $3)
         AND (m.party_type IS NULL OR m.party_type = $4)
         AND (m.party_id IS NULL OR m.party_id = $5)
         AND (m.item_id IS NULL OR m.item_id = $6)
         AND (m.warehouse_id IS NULL OR m.warehouse_id = $7)
       ORDER BY m.priority ASC, m.is_default DESC, m.created_at ASC
       LIMIT 1`,
      [
        companyId,
        accountSubtype,
        dimensions.payment_method || null,
        dimensions.party_type || null,
        dimensions.party_id || null,
        dimensions.item_id || null,
        dimensions.warehouse_id || null,
      ]
    );
    return rows[0] || null;
  }
}

module.exports = AccountRepository;
