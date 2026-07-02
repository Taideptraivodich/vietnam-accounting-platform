/**
 * EW-06 VAT Ledger — Writer Service
 *
 * EW-06 responsibility boundary:
 * - Writes tax_ledger_entries only.
 * - Does not compose or insert gl_entries.
 * - Does not decide VAT GL account mapping.
 * - Links each tax ledger row to journal_entry_id returned by EW-01 posting.
 *
 * Sales/Purchase own VAT GL line composition and account resolution, call
 * EW-01 postAccountingDocument(...), then call this writer with the returned
 * journal_entry_id inside the same transaction/unit-of-work.
 */

const TAX_TYPE_VAT = 'vat';
const VALID_TAX_DIRECTIONS = new Set(['input', 'output']);

const REQUIRED_WRITER_FIELDS = [
  'company_id',
  'source_document_type',
  'source_document_id',
  'source_document_line_id',
  'posting_date',
  'invoice_no',
  'invoice_date',
  'party_type',
  'party_id',
  'tax_direction',
  'tax_rate',
  'taxable_amount',
  'tax_amount',
  'tax_account_id',
  'journal_entry_id',
];

function buildIdempotencyKey({ sourceDocumentType, sourceDocumentId, sourceDocumentLineId, taxDirection, isReversal }) {
  const base = `${sourceDocumentType}:${sourceDocumentId}:${sourceDocumentLineId}:${taxDirection}`;
  return isReversal ? `${base}:reversal` : base;
}

function getValue(input, snakeName, camelName) {
  if (Object.prototype.hasOwnProperty.call(input, snakeName)) return input[snakeName];
  return input[camelName];
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function normalizeWriterInput(input = {}) {
  const entry = {
    companyId: getValue(input, 'company_id', 'companyId'),
    sourceDocumentType: getValue(input, 'source_document_type', 'sourceDocumentType'),
    sourceDocumentId: getValue(input, 'source_document_id', 'sourceDocumentId'),
    sourceDocumentLineId: getValue(input, 'source_document_line_id', 'sourceDocumentLineId'),
    postingDate: getValue(input, 'posting_date', 'postingDate'),
    invoiceNo: getValue(input, 'invoice_no', 'invoiceNo'),
    invoiceDate: getValue(input, 'invoice_date', 'invoiceDate'),
    partyType: getValue(input, 'party_type', 'partyType'),
    partyId: getValue(input, 'party_id', 'partyId'),
    taxDirection: getValue(input, 'tax_direction', 'taxDirection'),
    taxRate: getValue(input, 'tax_rate', 'taxRate'),
    taxableAmount: getValue(input, 'taxable_amount', 'taxableAmount'),
    taxAmount: getValue(input, 'tax_amount', 'taxAmount'),
    taxAccountId: getValue(input, 'tax_account_id', 'taxAccountId'),
    journalEntryId: getValue(input, 'journal_entry_id', 'journalEntryId'),
    taxType: getValue(input, 'tax_type', 'taxType') || TAX_TYPE_VAT,
    taxCategory: getValue(input, 'tax_category', 'taxCategory') || null,
    currency: getValue(input, 'currency', 'currency') || null,
    isReversal: !!getValue(input, 'is_reversal', 'isReversal'),
    reversalOfEntryId: getValue(input, 'reversal_of_entry_id', 'reversalOfEntryId') || null,
  };

  entry.idempotencyKey = getValue(input, 'idempotency_key', 'idempotencyKey') || buildIdempotencyKey({
    sourceDocumentType: entry.sourceDocumentType,
    sourceDocumentId: entry.sourceDocumentId,
    sourceDocumentLineId: entry.sourceDocumentLineId,
    taxDirection: entry.taxDirection,
    isReversal: entry.isReversal,
  });

  return entry;
}

function validateWriterInput(input = {}) {
  const normalized = normalizeWriterInput(input);
  const bySnakeName = {
    company_id: normalized.companyId,
    source_document_type: normalized.sourceDocumentType,
    source_document_id: normalized.sourceDocumentId,
    source_document_line_id: normalized.sourceDocumentLineId,
    posting_date: normalized.postingDate,
    invoice_no: normalized.invoiceNo,
    invoice_date: normalized.invoiceDate,
    party_type: normalized.partyType,
    party_id: normalized.partyId,
    tax_direction: normalized.taxDirection,
    tax_rate: normalized.taxRate,
    taxable_amount: normalized.taxableAmount,
    tax_amount: normalized.taxAmount,
    tax_account_id: normalized.taxAccountId,
    journal_entry_id: normalized.journalEntryId,
  };

  for (const field of REQUIRED_WRITER_FIELDS) {
    if (!hasValue(bySnakeName[field])) {
      throw new Error(`${field} is required`);
    }
  }

  if (!VALID_TAX_DIRECTIONS.has(normalized.taxDirection)) {
    throw new Error("tax_direction must be 'input' or 'output'");
  }
  if (normalized.taxType !== TAX_TYPE_VAT) {
    throw new Error("tax_type must be 'vat'");
  }

  return normalized;
}

function hasTaxMetadata(line) {
  return (
    line.taxRate !== null &&
    line.taxRate !== undefined &&
    line.taxAmount !== null &&
    line.taxAmount !== undefined
  );
}

function isTaxableLine(line) {
  return hasTaxMetadata(line) && Number(line.taxAmount) !== 0;
}

function createTaxLedgerService(repository) {
  /**
   * Required EW-06 writer contract.
   * Accepts the senior-mandated tax ledger fields, writes tax_ledger_entries,
   * and returns { row, inserted }. It never writes GL.
   */
  async function writeTaxLedgerEntry(input) {
    const normalized = validateWriterInput(input);

    if (Number(normalized.taxAmount) === 0) {
      return { row: null, inserted: false, skipped: true, reason: 'non_taxable' };
    }

    return repository.insert(normalized);
  }

  async function recordEntriesForInvoice({
    companyId,
    postingDate,
    invoiceNo,
    invoiceDate,
    sourceDocumentType,
    sourceDocumentId,
    journalEntryId,
    taxDirection,
    lines,
    requireTaxMetadata,
  }) {
    if (!companyId) throw new Error('companyId is required');
    if (!postingDate) throw new Error('postingDate is required');
    if (!invoiceNo) throw new Error('invoiceNo is required');
    if (!invoiceDate) throw new Error('invoiceDate is required');
    if (!sourceDocumentId) throw new Error('sourceDocumentId is required');
    if (!journalEntryId) throw new Error('journalEntryId is required');
    if (!Array.isArray(lines)) throw new Error('lines must be an array');

    const created = [];
    const skipped = [];

    for (const line of lines) {
      if (requireTaxMetadata && !hasTaxMetadata(line)) {
        skipped.push({ lineId: line.lineId, reason: 'no_tax_metadata' });
        continue;
      }

      if (!isTaxableLine(line)) {
        skipped.push({ lineId: line.lineId, reason: 'non_taxable' });
        continue;
      }

      const result = await writeTaxLedgerEntry({
        company_id: companyId,
        source_document_type: sourceDocumentType,
        source_document_id: sourceDocumentId,
        source_document_line_id: line.lineId,
        posting_date: postingDate,
        invoice_no: invoiceNo,
        invoice_date: invoiceDate,
        party_type: line.partyType,
        party_id: line.partyId,
        tax_direction: taxDirection,
        tax_rate: line.taxRate,
        taxable_amount: line.taxableAmount,
        tax_amount: line.taxAmount,
        tax_account_id: line.taxAccountId || line.accountId,
        journal_entry_id: journalEntryId,
        tax_category: line.taxCategory,
        currency: line.currency,
      });

      if (result.skipped) {
        skipped.push({ lineId: line.lineId, reason: result.reason });
      } else {
        created.push(result);
      }
    }

    return { created, skipped };
  }

  /** Backward-compatible Sales hook. Sales resolves VAT output account and EW-01 journal first. */
  async function recordVatOutput({
    companyId,
    postingDate,
    invoiceNo,
    invoiceDate,
    sourceDocumentId,
    sourceDocumentType = 'sales_invoice',
    journalEntryId,
    lines,
  }) {
    return recordEntriesForInvoice({
      companyId,
      postingDate,
      invoiceNo,
      invoiceDate,
      sourceDocumentType,
      sourceDocumentId,
      journalEntryId,
      taxDirection: 'output',
      lines,
      requireTaxMetadata: false,
    });
  }

  /** Backward-compatible Purchase hook. Purchase resolves VAT input account and EW-01 journal first. */
  async function recordVatInput({
    companyId,
    postingDate,
    invoiceNo,
    invoiceDate,
    sourceDocumentId,
    sourceDocumentType = 'purchase_invoice',
    journalEntryId,
    lines,
  }) {
    return recordEntriesForInvoice({
      companyId,
      postingDate,
      invoiceNo,
      invoiceDate,
      sourceDocumentType,
      sourceDocumentId,
      journalEntryId,
      taxDirection: 'input',
      lines,
      requireTaxMetadata: true,
    });
  }

  /**
   * Cancellation/reversal path. The caller must provide the reversal
   * journalEntryId returned by EW-01 reverseAccountingDocument/posting result.
   */
  async function reverseForSourceDocument({ companyId, sourceDocumentType, sourceDocumentId, postingDate, journalEntryId }) {
    if (!companyId) throw new Error('companyId is required');
    if (!sourceDocumentType) throw new Error('sourceDocumentType is required');
    if (!sourceDocumentId) throw new Error('sourceDocumentId is required');
    if (!postingDate) throw new Error('postingDate (reversal date) is required');
    if (!journalEntryId) throw new Error('journalEntryId is required for tax ledger reversal link');

    const activeEntries = await repository.findActiveBySourceDocument(
      companyId,
      sourceDocumentType,
      sourceDocumentId
    );

    const reversals = [];
    for (const original of activeEntries) {
      const result = await writeTaxLedgerEntry({
        company_id: companyId,
        posting_date: postingDate,
        source_document_type: sourceDocumentType,
        source_document_id: sourceDocumentId,
        source_document_line_id: original.source_document_line_id,
        invoice_no: original.invoice_no,
        invoice_date: original.invoice_date,
        party_type: original.party_type,
        party_id: original.party_id,
        tax_direction: original.tax_direction,
        tax_rate: original.tax_rate,
        taxable_amount: negate(original.taxable_amount),
        tax_amount: negate(original.tax_amount),
        tax_account_id: original.tax_account_id,
        journal_entry_id: journalEntryId,
        tax_type: TAX_TYPE_VAT,
        tax_category: original.tax_category,
        currency: original.currency,
        is_reversal: true,
        reversal_of_entry_id: original.id,
      });

      reversals.push({ ...result, originalEntryId: original.id });
    }

    return { reversals };
  }

  async function queryEntries({ companyId, from, to, taxDirection }) {
    if (!companyId) throw new Error('companyId is required');
    if (taxDirection && !VALID_TAX_DIRECTIONS.has(taxDirection)) {
      throw new Error("taxDirection must be 'input' or 'output'");
    }
    return repository.query({ companyId, from, to, taxDirection });
  }

  return {
    writeTaxLedgerEntry,
    recordVatOutput,
    recordVatInput,
    reverseForSourceDocument,
    queryEntries,
  };
}

function negate(amount) {
  return Number((-Number(amount)).toFixed(2));
}

module.exports = {
  createTaxLedgerService,
  buildIdempotencyKey,
  validateWriterInput,
  normalizeWriterInput,
  isTaxableLine,
  hasTaxMetadata,
  REQUIRED_WRITER_FIELDS,
};
