/**
 * EW-06 VAT Ledger — Postgres Repository
 *
 * Accepts any object with a query(sql, params) method: Pool, Client, or an
 * existing transaction client/unit-of-work. This repository never starts or
 * commits its own transaction, so Sales/Purchase can call it atomically with
 * source document + EW-01 GL + AR/AP/inventory side effects.
 *
 * Deliberately does NOT export update() or delete(). Append-only is enforced
 * by omission here and by migration triggers in the DB layer.
 */

function createPgTaxLedgerRepository(db) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('db query executor is required');
  }

  return {
    async insert(entry) {
      const text = `
        INSERT INTO tax_ledger_entries (
          company_id, posting_date,
          source_document_type, source_document_id, source_document_line_id,
          invoice_no, invoice_date,
          tax_direction, tax_type, tax_rate, tax_category,
          tax_account_id, journal_entry_id,
          party_type, party_id,
          taxable_amount, tax_amount, currency,
          is_reversal, reversal_of_entry_id,
          idempotency_key
        ) VALUES (
          $1, $2,
          $3, $4, $5,
          $6, $7,
          $8, $9, $10, $11,
          $12, $13,
          $14, $15,
          $16, $17, $18,
          $19, $20,
          $21
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *;
      `;
      const values = [
        entry.companyId, entry.postingDate,
        entry.sourceDocumentType, entry.sourceDocumentId, entry.sourceDocumentLineId,
        entry.invoiceNo, entry.invoiceDate,
        entry.taxDirection, entry.taxType || 'vat', entry.taxRate, entry.taxCategory,
        entry.taxAccountId, entry.journalEntryId,
        entry.partyType, entry.partyId,
        entry.taxableAmount, entry.taxAmount, entry.currency,
        entry.isReversal || false, entry.reversalOfEntryId || null,
        entry.idempotencyKey,
      ];

      const insertResult = await db.query(text, values);
      if (insertResult.rows.length > 0) {
        return { row: insertResult.rows[0], inserted: true };
      }

      const existing = await db.query(
        'SELECT * FROM tax_ledger_entries WHERE idempotency_key = $1',
        [entry.idempotencyKey]
      );
      return { row: existing.rows[0], inserted: false };
    },

    async findActiveBySourceDocument(companyId, sourceDocumentType, sourceDocumentId) {
      const text = `
        SELECT t.*
        FROM tax_ledger_entries t
        WHERE t.company_id = $1
          AND t.source_document_type = $2
          AND t.source_document_id = $3
          AND t.is_reversal = FALSE
          AND NOT EXISTS (
            SELECT 1 FROM tax_ledger_entries r
            WHERE r.reversal_of_entry_id = t.id
          )
        ORDER BY t.created_at ASC;
      `;
      const result = await db.query(text, [companyId, sourceDocumentType, sourceDocumentId]);
      return result.rows;
    },

    async query({ companyId, from, to, taxDirection }) {
      if (!companyId) {
        throw new Error('companyId is required for tax ledger queries');
      }
      const conditions = ['company_id = $1'];
      const values = [companyId];

      if (from) {
        values.push(from);
        conditions.push(`posting_date >= $${values.length}`);
      }
      if (to) {
        values.push(to);
        conditions.push(`posting_date <= $${values.length}`);
      }
      if (taxDirection) {
        values.push(taxDirection);
        conditions.push(`tax_direction = $${values.length}`);
      }

      const text = `
        SELECT * FROM tax_ledger_entries
        WHERE ${conditions.join(' AND ')}
        ORDER BY posting_date ASC, created_at ASC;
      `;
      const result = await db.query(text, values);
      return result.rows;
    },
  };
}

module.exports = { createPgTaxLedgerRepository };
