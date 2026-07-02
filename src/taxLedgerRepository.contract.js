/**
 * EW-06 VAT Ledger Repository Contract
 *
 * Repository methods:
 * - insert(entry) -> { row, inserted: boolean }
 * - findActiveBySourceDocument(companyId, sourceDocumentType, sourceDocumentId) -> entry[]
 * - query({ companyId, from, to, taxDirection }) -> entry[]
 *
 * No update/delete methods are part of this contract. Posted tax ledger rows are
 * append-only. Cancellation/reversal is represented by a new inserted row with
 * is_reversal=true and reversal_of_entry_id pointing at the original row.
 *
 * Entry columns include:
 * company_id, posting_date, source_document_type, source_document_id,
 * source_document_line_id, invoice_no, invoice_date, tax_direction, tax_type,
 * tax_rate, tax_category, tax_account_id, journal_entry_id, party_type,
 * party_id, taxable_amount, tax_amount, currency, is_reversal,
 * reversal_of_entry_id, idempotency_key, created_at.
 */

module.exports = {};
