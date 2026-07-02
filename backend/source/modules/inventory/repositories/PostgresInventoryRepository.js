'use strict';

class PostgresInventoryRepository {
  constructor({ pool }) {
    if (!pool) throw new Error('pool is required');
    this.pool = pool;
  }

  async #query(tx, sql, params) {
    const client = tx || this.pool;
    return client.query(sql, params);
  }

  async getStockBalance({ companyId, itemId, warehouseId, tx, trx }) {
    const result = await this.#query(tx || trx, `
      SELECT company_id, item_id, warehouse_id, actual_qty, stock_value, valuation_rate, last_inventory_ledger_entry_id
      FROM stock_balances
      WHERE company_id = $1 AND item_id = $2 AND warehouse_id = $3
    `, [companyId, itemId, warehouseId]);
    if (result.rows[0]) return result.rows[0];
    return {
      company_id: companyId,
      item_id: itemId,
      warehouse_id: warehouseId,
      actual_qty: 0,
      stock_value: 0,
      valuation_rate: 0,
      last_inventory_ledger_entry_id: null,
    };
  }

  async upsertStockBalance(balance, tx) {
    const result = await this.#query(tx, `
      INSERT INTO stock_balances (
        company_id,
        item_id,
        warehouse_id,
        actual_qty,
        stock_value,
        valuation_rate,
        last_inventory_ledger_entry_id,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (company_id, item_id, warehouse_id)
      DO UPDATE SET
        actual_qty = EXCLUDED.actual_qty,
        stock_value = EXCLUDED.stock_value,
        valuation_rate = EXCLUDED.valuation_rate,
        last_inventory_ledger_entry_id = EXCLUDED.last_inventory_ledger_entry_id,
        updated_at = NOW()
      RETURNING *
    `, [
      balance.company_id,
      balance.item_id,
      balance.warehouse_id,
      balance.actual_qty,
      balance.stock_value,
      balance.valuation_rate,
      balance.last_inventory_ledger_entry_id,
    ]);
    return result.rows[0];
  }

  async insertLedgerEntry(entry, tx) {
    const result = await this.#query(tx, `
      INSERT INTO inventory_ledger_entries (
        id,
        company_id,
        item_id,
        warehouse_id,
        posting_date,
        posting_time,
        source_document_type,
        source_document_id,
        source_document_line_id,
        movement_type,
        quantity_change,
        qty_after_transaction,
        valuation_rate,
        stock_value,
        stock_value_difference,
        transfer_group_id,
        transfer_pair_id,
        is_reversal,
        reverses_inventory_ledger_entry_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      RETURNING *
    `, [
      entry.id,
      entry.company_id,
      entry.item_id,
      entry.warehouse_id,
      entry.posting_date,
      entry.posting_time,
      entry.source_document_type,
      entry.source_document_id,
      entry.source_document_line_id,
      entry.movement_type,
      entry.quantity_change,
      entry.qty_after_transaction,
      entry.valuation_rate,
      entry.stock_value,
      entry.stock_value_difference,
      entry.transfer_group_id,
      entry.transfer_pair_id,
      entry.is_reversal,
      entry.reverses_inventory_ledger_entry_id,
    ]);
    return result.rows[0];
  }

  async getLedgerEntryById(id, tx) {
    const result = await this.#query(tx, `
      SELECT * FROM inventory_ledger_entries WHERE id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async listLedgerEntries({ companyId, itemId, warehouseId, tx, trx }) {
    const result = await this.#query(tx || trx, `
      SELECT *
      FROM inventory_ledger_entries
      WHERE company_id = $1 AND item_id = $2 AND warehouse_id = $3
      ORDER BY posting_date, posting_time, created_at
    `, [companyId, itemId, warehouseId]);
    return result.rows;
  }

  async hasLaterLedgerEntry({ companyId, itemId, warehouseId, postingDate, postingTime, tx, trx }) {
    const result = await this.#query(tx || trx, `
      SELECT 1
      FROM inventory_ledger_entries
      WHERE company_id = $1
        AND item_id = $2
        AND warehouse_id = $3
        AND (posting_date, posting_time) > ($4::date, $5::time)
      LIMIT 1
    `, [companyId, itemId, warehouseId, postingDate, postingTime || '00:00:00']);
    return result.rowCount > 0;
  }
}

module.exports = { PostgresInventoryRepository };
