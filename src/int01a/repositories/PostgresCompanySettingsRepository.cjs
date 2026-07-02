'use strict';

/**
 * INT-01B v1.3 — PostgreSQL-backed company settings repository.
 *
 * This repository is intentionally read-only. It resolves the Sales/Delivery
 * company settings dependency from a real PostgreSQL row scoped by company_id
 * (or id for the MD-01 companies table) and exposes the method aliases used by
 * the approved EW-03 SalesPostingService, SalesInvoiceService, and module surface.
 */
class PostgresCompanySettingsRepository {
  constructor({
    pool,
    schema = process.env.INT01A_COMPANY_SETTINGS_SCHEMA || 'public',
    tableNames,
    defaultSalesStockPattern = process.env.INT01A_DEFAULT_SALES_STOCK_PATTERN || 'invoice_updates_stock',
  } = {}) {
    if (!pool || typeof pool.query !== 'function') {
      throw new Error('PostgresCompanySettingsRepository requires a pg-compatible pool/client');
    }
    this.pool = pool;
    this.schema = assertIdentifier(schema, 'schema');
    this.tableNames = (tableNames && tableNames.length ? tableNames : [
      process.env.INT01A_COMPANY_SETTINGS_TABLE,
      'company_settings',
      'companies',
    ]).filter(Boolean).map((name) => assertIdentifier(name, 'company settings table'));
    this.defaultSalesStockPattern = defaultSalesStockPattern;
    this._metaCache = null;
  }

  async getSalesStockPattern(companyId, tx) {
    const settings = await this.getCompanySettings(companyId, tx);
    return settings.sales_stock_pattern;
  }

  async getDefaultSalesStockPattern(companyId, tx) {
    return this.getSalesStockPattern(companyId, tx);
  }

  async getSalesSettings(companyId, tx) {
    return this.getCompanySettings(companyId, tx);
  }

  async getCompanyDefaults(companyId, tx) {
    return this.getCompanySettings(companyId, tx);
  }

  async getByCompanyId(companyId, tx) {
    return this.getCompanySettings(companyId, tx);
  }

  async findByCompanyId(companyId, tx) {
    return this.getCompanySettings(companyId, tx);
  }

  async getCompanySettings(companyId, tx) {
    assertCompanyId(companyId);
    const row = await this._readScopedRow(companyId, tx || this.pool);
    return normalizeSettings(row, companyId, this.defaultSalesStockPattern);
  }

  async _readScopedRow(companyId, client) {
    const metas = await this._loadTableMetadata(client);
    for (const meta of metas) {
      const sql = `SELECT * FROM ${quoteIdent(this.schema)}.${quoteIdent(meta.tableName)} WHERE ${quoteIdent(meta.companyColumn)} = $1 LIMIT 1`;
      const result = await client.query(sql, [companyId]);
      if (result.rows && result.rows[0]) {
        return result.rows[0];
      }
    }
    throw new Error(`companySettingsRepository: company settings row not found for company_id=${companyId}`);
  }

  async _loadTableMetadata(client) {
    if (this._metaCache) return this._metaCache;
    const metas = [];
    for (const tableName of this.tableNames) {
      const columnsResult = await client.query(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position`,
        [this.schema, tableName]
      );
      const columns = new Set(columnsResult.rows.map((row) => row.column_name));
      if (!columns.size) continue;
      const companyColumn = columns.has('company_id') ? 'company_id' : (columns.has('id') ? 'id' : null);
      if (!companyColumn) continue;
      metas.push({ tableName, companyColumn, columns });
    }
    if (!metas.length) {
      throw new Error(`companySettingsRepository: no scoped company settings source table found in schema ${this.schema}`);
    }
    this._metaCache = metas;
    return metas;
  }
}

function normalizeSettings(row, requestedCompanyId, defaultSalesStockPattern) {
  const companyId = row.company_id || row.id || requestedCompanyId;
  const salesStockPattern = firstNonBlank([
    row.sales_stock_pattern,
    row.default_sales_stock_pattern,
    row.sales_invoice_stock_pattern,
    row.stock_update_pattern,
    row.default_stock_update_pattern,
    row.sales_stock_update_pattern,
    defaultSalesStockPattern,
  ]);

  if (!salesStockPattern) {
    throw new Error(`companySettingsRepository: sales stock pattern is not configured for company_id=${requestedCompanyId}`);
  }

  const perpetualInventory = parseBoolean(firstNonBlank([
    row.enable_perpetual_inventory,
    row.perpetual_inventory_enabled,
    row.is_perpetual_inventory_enabled,
  ]), true);

  return {
    ...row,
    company_id: companyId,
    companyId,
    sales_stock_pattern: salesStockPattern,
    default_sales_stock_pattern: salesStockPattern,
    salesStockPattern,
    defaultSalesStockPattern: salesStockPattern,
    stock_pattern: salesStockPattern,
    enable_perpetual_inventory: perpetualInventory,
    perpetualInventoryEnabled: perpetualInventory,
    isPerpetualInventoryEnabled: perpetualInventory,
  };
}

function firstNonBlank(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', 't', 'yes', 'y', '1', 'on', 'enabled'].includes(String(value).trim().toLowerCase());
}

function assertCompanyId(companyId) {
  if (companyId === undefined || companyId === null || String(companyId).trim() === '') {
    throw new Error('companySettingsRepository: company_id is required');
  }
}

function assertIdentifier(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(value || ''))) {
    throw new Error(`Invalid ${label} identifier: ${value}`);
  }
  return String(value);
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

module.exports = {
  PostgresCompanySettingsRepository,
};
