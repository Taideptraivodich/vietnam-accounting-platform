/** Fake repository for tests. Mirrors the append-only EW-06 repository contract. */

const crypto = require('crypto');

function createFakeTaxLedgerRepository() {
  const rows = [];
  let seq = 0;

  return {
    rows,

    async insert(entry) {
      const existing = rows.find((r) => r.idempotency_key === entry.idempotencyKey);
      if (existing) {
        return { row: existing, inserted: false };
      }

      seq += 1;
      const row = {
        id: crypto.randomUUID ? crypto.randomUUID() : `fake-id-${seq}`,
        company_id: entry.companyId,
        posting_date: entry.postingDate,
        source_document_type: entry.sourceDocumentType,
        source_document_id: entry.sourceDocumentId,
        source_document_line_id: entry.sourceDocumentLineId,
        invoice_no: entry.invoiceNo,
        invoice_date: entry.invoiceDate,
        tax_direction: entry.taxDirection,
        tax_type: entry.taxType || 'vat',
        tax_rate: entry.taxRate,
        tax_category: entry.taxCategory,
        tax_account_id: entry.taxAccountId,
        journal_entry_id: entry.journalEntryId,
        party_type: entry.partyType,
        party_id: entry.partyId,
        taxable_amount: entry.taxableAmount,
        tax_amount: entry.taxAmount,
        currency: entry.currency,
        is_reversal: !!entry.isReversal,
        reversal_of_entry_id: entry.reversalOfEntryId || null,
        idempotency_key: entry.idempotencyKey,
        created_at: new Date().toISOString(),
      };
      rows.push(row);
      return { row, inserted: true };
    },

    async findActiveBySourceDocument(companyId, sourceDocumentType, sourceDocumentId) {
      const reversedOriginalIds = new Set(
        rows.filter((r) => r.reversal_of_entry_id).map((r) => r.reversal_of_entry_id)
      );
      return rows.filter(
        (r) =>
          r.company_id === companyId &&
          r.source_document_type === sourceDocumentType &&
          r.source_document_id === sourceDocumentId &&
          !r.is_reversal &&
          !reversedOriginalIds.has(r.id)
      );
    },

    async query({ companyId, from, to, taxDirection }) {
      if (!companyId) throw new Error('companyId is required for tax ledger queries');
      return rows.filter((r) => {
        if (r.company_id !== companyId) return false;
        if (from && r.posting_date < from) return false;
        if (to && r.posting_date > to) return false;
        if (taxDirection && r.tax_direction !== taxDirection) return false;
        return true;
      });
    },
  };
}

module.exports = { createFakeTaxLedgerRepository };
