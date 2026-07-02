'use strict';

/**
 * GlEntryRepository — ONLY Core Accounting uses this.
 * Append-only. No update/delete methods are exposed.
 */
class GlEntryRepository {
  constructor(db) {
    this.db = db;
  }

  _client(tx) {
    return tx || this.db;
  }

  async appendBatch(entries, tx) {
    const inserted = [];
    for (const e of entries) {
      const { rows } = await this._client(tx).query(
        `INSERT INTO gl_entries
           (company_id, journal_entry_id, journal_entry_line_id,
            account_id, posting_date,
            debit_amount, credit_amount, currency,
            source_document_type, source_document_id, source_document_no,
            source_document_line_id, party_type, party_id, warehouse_id,
            inventory_item_id, inventory_ledger_entry_id, tax_metadata, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          e.company_id,
          e.journal_entry_id,
          e.journal_entry_line_id,
          e.account_id,
          e.posting_date,
          e.debit_amount || 0,
          e.credit_amount || 0,
          e.currency || 'VND',
          e.source_document_type || null,
          e.source_document_id || null,
          e.source_document_no || null,
          e.source_document_line_id || null,
          e.party_type || null,
          e.party_id || null,
          e.warehouse_id || null,
          e.inventory_item_id || null,
          e.inventory_ledger_entry_id || null,
          e.tax_metadata || {},
          e.idempotency_key || null,
        ]
      );
      inserted.push(rows[0]);
    }
    return inserted;
  }

  async findByIdempotencyKey(companyId, idempotencyKey, tx) {
    if (!idempotencyKey) return [];
    const { rows } = await this._client(tx).query(
      `SELECT * FROM gl_entries
       WHERE company_id = $1 AND idempotency_key = $2
       ORDER BY created_at, id`,
      [companyId, idempotencyKey]
    );
    return rows;
  }

  async queryByJournalEntryId(companyId, journalEntryId, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM gl_entries
       WHERE company_id = $1 AND journal_entry_id = $2
       ORDER BY created_at, id`,
      [companyId, journalEntryId]
    );
    return rows;
  }

  async queryByCompanyAndDateRange(companyId, fromDate, toDate, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM gl_entries
       WHERE company_id = $1
         AND posting_date BETWEEN $2 AND $3
       ORDER BY posting_date, id`,
      [companyId, fromDate, toDate]
    );
    return rows;
  }

  async queryByAccount(companyId, accountId, fromDate, toDate, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM gl_entries
       WHERE company_id = $1 AND account_id = $2
         AND posting_date BETWEEN $3 AND $4
       ORDER BY posting_date, id`,
      [companyId, accountId, fromDate, toDate]
    );
    return rows;
  }

  async trialBalance(companyId, fromDate, toDate, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT account_id,
              SUM(debit_amount)  AS total_debit,
              SUM(credit_amount) AS total_credit
       FROM gl_entries
       WHERE company_id = $1
         AND posting_date BETWEEN $2 AND $3
       GROUP BY account_id
       ORDER BY account_id`,
      [companyId, fromDate, toDate]
    );
    return rows;
  }
}

module.exports = GlEntryRepository;
