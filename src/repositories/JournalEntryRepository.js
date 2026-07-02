'use strict';

/**
 * JournalEntryRepository
 *
 * All methods accept optional `tx` so Core Accounting can write through the
 * transaction opened by a business module application service.
 */
class JournalEntryRepository {
  constructor(db) {
    this.db = db;
  }

  _client(tx) {
    return tx || this.db;
  }

  async create(companyId, data, tx) {
    const { rows } = await this._client(tx).query(
      `INSERT INTO journal_entries
         (company_id, posting_date, description, status,
          source_document_type, source_document_id, source_document_no,
          idempotency_key, reversal_of_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        companyId,
        data.posting_date,
        data.description || null,
        data.status || 'DRAFT',
        data.source_document_type || null,
        data.source_document_id || null,
        data.source_document_no || null,
        data.idempotency_key || null,
        data.reversal_of_id || null,
      ]
    );
    return rows[0];
  }

  async findById(companyId, id, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM journal_entries WHERE company_id = $1 AND id = $2`,
      [companyId, id]
    );
    return rows[0] || null;
  }

  async findByIdempotencyKey(companyId, idempotencyKey, tx) {
    if (!idempotencyKey) return null;
    const { rows } = await this._client(tx).query(
      `SELECT * FROM journal_entries
       WHERE company_id = $1 AND idempotency_key = $2`,
      [companyId, idempotencyKey]
    );
    return rows[0] || null;
  }

  async findPostedBySource(companyId, sourceDocumentType, sourceDocumentId, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM journal_entries
       WHERE company_id = $1
         AND source_document_type = $2
         AND source_document_id = $3
         AND status = 'POSTED'
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, sourceDocumentType, sourceDocumentId]
    );
    return rows[0] || null;
  }

  async updateStatus(companyId, id, status, tx) {
    const { rows } = await this._client(tx).query(
      `UPDATE journal_entries
       SET status = $1, updated_at = NOW()
       WHERE company_id = $2 AND id = $3
       RETURNING *`,
      [status, companyId, id]
    );
    return rows[0] || null;
  }

  async setReversalOfId(companyId, reversalId, originalId, tx) {
    await this._client(tx).query(
      `UPDATE journal_entries
       SET reversal_of_id = $1, updated_at = NOW()
       WHERE company_id = $2 AND id = $3`,
      [originalId, companyId, reversalId]
    );
  }

  async setReversedById(companyId, originalId, reversalId, tx) {
    await this._client(tx).query(
      `UPDATE journal_entries
       SET reversed_by_id = $1, status = 'CANCELLED', updated_at = NOW()
       WHERE company_id = $2 AND id = $3`,
      [reversalId, companyId, originalId]
    );
  }

  async addLines(journalEntryId, companyId, lines, tx) {
    const inserted = [];
    for (const line of lines) {
      const { rows } = await this._client(tx).query(
        `INSERT INTO journal_entry_lines
           (journal_entry_id, company_id, account_id,
            debit_amount, credit_amount, currency, description,
            source_document_type, source_document_id, source_document_no,
            source_document_line_id, party_type, party_id, warehouse_id,
            inventory_item_id, inventory_ledger_entry_id, tax_metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          journalEntryId,
          companyId,
          line.account_id,
          line.debit_amount || 0,
          line.credit_amount || 0,
          line.currency || 'VND',
          line.description || null,
          line.source_document_type || null,
          line.source_document_id || null,
          line.source_document_no || null,
          line.source_document_line_id || null,
          line.party_type || null,
          line.party_id || null,
          line.warehouse_id || null,
          line.inventory_item_id || null,
          line.inventory_ledger_entry_id || null,
          line.tax_metadata || {},
        ]
      );
      inserted.push(rows[0]);
    }
    return inserted;
  }

  async replaceDraftLines(journalEntryId, companyId, lines, tx) {
    await this._client(tx).query(
      `DELETE FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [journalEntryId]
    );
    return this.addLines(journalEntryId, companyId, lines || [], tx);
  }

  async updateDraftHeader(companyId, id, data, tx) {
    const { rows } = await this._client(tx).query(
      `UPDATE journal_entries
       SET posting_date = $1,
           description = $2,
           source_document_type = $3,
           source_document_id = $4,
           source_document_no = $5,
           idempotency_key = $6,
           updated_at = NOW()
       WHERE company_id = $7 AND id = $8
       RETURNING *`,
      [
        data.posting_date,
        data.description || null,
        data.source_document_type || null,
        data.source_document_id || null,
        data.source_document_no || null,
        data.idempotency_key || null,
        companyId,
        id,
      ]
    );
    return rows[0] || null;
  }

  async getLines(journalEntryId, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1 ORDER BY id`,
      [journalEntryId]
    );
    return rows;
  }
}

module.exports = JournalEntryRepository;
