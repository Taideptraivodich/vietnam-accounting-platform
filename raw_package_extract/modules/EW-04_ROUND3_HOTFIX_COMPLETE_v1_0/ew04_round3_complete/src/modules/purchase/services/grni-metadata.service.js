/**
 * EW-04 — GRNI Account Metadata Service
 * Architecture Freeze v1.0 / Targeted Revision P0
 *
 * GRNI is a liability/payable clearing account for goods received but not yet invoiced.
 * It must never be mapped to TK 151.
 * Canonical account source is EW-01 accounts.id, not legacy chart tables.
 */

const { randomUUID } = require('crypto');
const { grniAccountMetadataSchema } = require('../validators/purchase.validators');

class GRNIMetadataService {
  constructor({ db }) {
    this.db = db;
  }

  /**
   * Register GRNI account metadata for a company.
   * Validates canonical accounts.id/account_id reference + account_subtype guardrails.
   */
  async registerGRNIAccount(companyId, payload) {
    const parsed = grniAccountMetadataSchema.parse(payload);

    const account = await this.db('accounts')
      .where({ id: parsed.account_id, company_id: companyId })
      .select({ account_id: 'id', account_code: 'code', account_name: 'name' }, 'account_type', 'account_subtype')
      .first();
    if (!account) {
      throw new Error(`INVALID: accounts.id ${parsed.account_id} not found for company ${companyId}`);
    }

    if (account.account_subtype !== 'goods_received_not_invoiced') {
      throw new Error(
        `INVALID: GRNI account ${parsed.account_id} must have account_subtype=goods_received_not_invoiced; ` +
        `actual=${account.account_subtype}`
      );
    }

    this._assertNotTK151(account);

    const id = randomUUID();
    await this.db('grni_account_metadata')
      .insert({
        id,
        company_id: companyId,
        account_id: parsed.account_id,
        account_subtype: 'goods_received_not_invoiced',
        requires_party: true,
        default_party_type: 'supplier',
        requires_inventory_item: true,
        requires_warehouse: true,
      })
      .onConflict(['company_id', 'account_id'])
      .merge();

    return { id, account_id: parsed.account_id };
  }

  /**
   * Get GRNI account for a company.
   */
  async getGRNIAccount(companyId) {
    const meta = await this.db('grni_account_metadata')
      .where({ 'grni_account_metadata.company_id': companyId })
      .join('accounts as a', 'a.id', 'grni_account_metadata.account_id')
      .select(
        'grni_account_metadata.*',
        'a.code as account_code',
        'a.name as account_name',
        'a.account_type',
        'a.account_subtype as resolved_account_subtype'
      )
      .first();

    if (!meta) {
      throw new Error(
        `GRNI_NOT_CONFIGURED: Company ${companyId} has no GRNI account registered. ` +
        'Register via POST /api/v1/companies/:companyId/purchase/grni-account'
      );
    }

    this._assertNotTK151(meta);
    this.validateGRNIConstraints(meta);
    if (meta.resolved_account_subtype !== 'goods_received_not_invoiced') {
      throw new Error(
        `GRNI_METADATA_INVALID: linked accounts.account_subtype must be goods_received_not_invoiced; ` +
        `actual=${meta.resolved_account_subtype}`
      );
    }

    return meta;
  }

  /**
   * Validate GRNI metadata constraints at posting time.
   */
  validateGRNIConstraints(meta) {
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

module.exports = { GRNIMetadataService };
