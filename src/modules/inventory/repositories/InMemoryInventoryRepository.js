'use strict';

const { comparePostingTimestamp } = require('../services/InventoryService');

function keyOf({ companyId, itemId, warehouseId }) {
  return `${companyId}::${itemId}::${warehouseId}`;
}

function publicKey(row) {
  return keyOf({ companyId: row.company_id, itemId: row.item_id, warehouseId: row.warehouse_id });
}

class InMemoryInventoryRepository {
  constructor() {
    this.ledgerEntries = [];
    this.stockBalances = new Map();
  }

  clone() {
    const next = new InMemoryInventoryRepository();
    next.ledgerEntries = this.ledgerEntries.map((row) => ({ ...row }));
    next.stockBalances = new Map([...this.stockBalances.entries()].map(([k, v]) => [k, { ...v }]));
    return next;
  }

  replaceWith(other) {
    this.ledgerEntries = other.ledgerEntries.map((row) => ({ ...row }));
    this.stockBalances = new Map([...other.stockBalances.entries()].map(([k, v]) => [k, { ...v }]));
  }

  async runInTransaction(fn) {
    const snapshot = this.clone();
    const tx = { kind: 'in_memory_inventory_transaction' };
    try {
      return await fn(tx);
    } catch (error) {
      this.replaceWith(snapshot);
      throw error;
    }
  }

  async getStockBalance({ companyId, itemId, warehouseId }) {
    const existing = this.stockBalances.get(keyOf({ companyId, itemId, warehouseId }));
    if (existing) return { ...existing };
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

  async upsertStockBalance(balance) {
    this.stockBalances.set(publicKey(balance), { ...balance, updated_at: new Date().toISOString() });
    return { ...this.stockBalances.get(publicKey(balance)) };
  }

  async insertLedgerEntry(entry) {
    if (this.ledgerEntries.some((row) => row.id === entry.id)) {
      throw new Error(`duplicate inventory ledger entry id: ${entry.id}`);
    }
    if (entry.qty_after_transaction < 0) {
      throw new Error('negative stock rejected by repository guard');
    }
    const later = await this.hasLaterLedgerEntry({
      companyId: entry.company_id,
      itemId: entry.item_id,
      warehouseId: entry.warehouse_id,
      postingDate: entry.posting_date,
      postingTime: entry.posting_time,
    });
    if (later) {
      throw new Error('backdated inventory ledger entry rejected by repository guard');
    }
    this.ledgerEntries.push({ ...entry, created_at: new Date().toISOString() });
    return { ...entry };
  }

  async updateLedgerEntry() {
    throw new Error('inventory_ledger_entries is append-only; UPDATE rejected');
  }

  async deleteLedgerEntry() {
    throw new Error('inventory_ledger_entries is append-only; DELETE rejected');
  }

  async getLedgerEntryById(id) {
    const row = this.ledgerEntries.find((entry) => entry.id === id);
    return row ? { ...row } : null;
  }

  async listLedgerEntries({ companyId, itemId, warehouseId }) {
    return this.ledgerEntries
      .filter((entry) => entry.company_id === companyId && entry.item_id === itemId && entry.warehouse_id === warehouseId)
      .map((entry) => ({ ...entry }))
      .sort(comparePostingTimestamp);
  }

  async hasLaterLedgerEntry({ companyId, itemId, warehouseId, postingDate, postingTime }) {
    const candidate = { posting_date: postingDate, posting_time: postingTime || '00:00:00' };
    return this.ledgerEntries.some((entry) => (
      entry.company_id === companyId
      && entry.item_id === itemId
      && entry.warehouse_id === warehouseId
      && comparePostingTimestamp(entry, candidate) > 0
    ));
  }
}

module.exports = { InMemoryInventoryRepository };
