'use strict';

const { withTransaction, assertTransactionClient } = require('../utils/UnitOfWork');

/**
 * PostingService — EW-01 Core Accounting GL Foundation.
 *
 * This is the ONLY service that writes gl_entries.
 * Business modules must call postAccountingDocument(request, tx) or
 * reverseAccountingDocument(request, tx); they must NOT write GL directly.
 */
class PostingService {
  constructor({ journalEntryRepository, glEntryRepository, postingValidator, db }) {
    this.jeRepo = journalEntryRepository;
    this.glRepo = glEntryRepository;
    this.validator = postingValidator;
    this.db = db;
  }

  // ─────────────────────────────────────────────────────────────
  // REQUIRED SHARED CONTRACT: POST ACCOUNTING DOCUMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Post an accounting document using the transaction opened by caller.
   *
   * @param {object} request
   * @param {string} request.company_id
   * @param {string} request.posting_date YYYY-MM-DD
   * @param {string} request.source_document_type
   * @param {string} request.source_document_id
   * @param {string} [request.source_document_no]
   * @param {string} request.idempotency_key required for business documents
   * @param {Array<object>} request.lines balanced accounting lines
   * @param {object} tx pg transaction client supplied by business module
   * @returns {{journal_entry_id:string, gl_entry_ids:string[], source_document_type:string, source_document_id:string, status:string, idempotent:boolean}}
   */
  async postAccountingDocument(request, tx) {
    assertTransactionClient(tx);

    const normalized = this._normalizePostingRequest(request);
    const contractErrors = this._validatePostContract(normalized);
    if (contractErrors.length > 0) throw new ValidationError(contractErrors.join(' | '));

    const existingJe = await this.jeRepo.findByIdempotencyKey(
      normalized.company_id,
      normalized.idempotency_key,
      tx
    );
    if (existingJe) {
      if (existingJe.status !== 'POSTED' && existingJe.status !== 'CANCELLED') {
        throw new ValidationError(`Idempotency key ${normalized.idempotency_key} already exists on non-posted journal entry ${existingJe.id}.`);
      }
      const existingGl = await this.glRepo.queryByJournalEntryId(normalized.company_id, existingJe.id, tx);
      return this._postingResult(existingJe, existingGl, true);
    }

    const validationErrors = await this.validator.validate(
      normalized.company_id,
      {
        posting_date: normalized.posting_date,
        lines: normalized.lines,
      },
      tx
    );
    if (validationErrors.length > 0) throw new ValidationError(validationErrors.join(' | '));

    const je = await this.jeRepo.create(normalized.company_id, {
      posting_date: normalized.posting_date,
      description: normalized.description,
      status: 'POSTED',
      source_document_type: normalized.source_document_type,
      source_document_id: normalized.source_document_id,
      source_document_no: normalized.source_document_no,
      idempotency_key: normalized.idempotency_key,
    }, tx);

    const linePayloads = normalized.lines.map(line => ({
      ...line,
      source_document_type: line.source_document_type || normalized.source_document_type,
      source_document_id: line.source_document_id || normalized.source_document_id,
      source_document_no: line.source_document_no || normalized.source_document_no,
      tax_metadata: line.tax_metadata || normalized.tax_metadata || {},
    }));

    const lines = await this.jeRepo.addLines(je.id, normalized.company_id, linePayloads, tx);
    const glEntries = await this.glRepo.appendBatch(lines.map(line => this._toGlPayload(je, line, normalized.idempotency_key)), tx);

    return this._postingResult(je, glEntries, false);
  }

  /**
   * Convenience wrapper for standalone UI/admin flows only.
   * Business modules should NOT use this wrapper because they must compose all
   * source/subledger/inventory/tax effects inside their own Unit of Work.
   */
  async postAccountingDocumentStandalone(request) {
    return withTransaction(this.db, tx => this.postAccountingDocument(request, tx));
  }

  // ─────────────────────────────────────────────────────────────
  // REQUIRED SHARED CONTRACT: REVERSE ACCOUNTING DOCUMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Reverse a previously posted accounting document using caller transaction.
   * Reversal creates a new posted journal entry and new GL rows.
   * It never updates or deletes original gl_entries.
   *
   * @param {object} request
   * @param {string} request.company_id
   * @param {string} request.posting_date reversal posting date
   * @param {string} request.idempotency_key required for reversal idempotency
   * @param {string} [request.journal_entry_id] original JE id, preferred when known
   * @param {string} [request.source_document_type]
   * @param {string} [request.source_document_id]
   * @param {string} [request.source_document_no]
   * @param {string} [request.description]
   * @param {object} tx pg transaction client supplied by business module
   */
  async reverseAccountingDocument(request, tx) {
    assertTransactionClient(tx);

    const reversal = this._normalizeReversalRequest(request);
    const contractErrors = this._validateReverseContract(reversal);
    if (contractErrors.length > 0) throw new ValidationError(contractErrors.join(' | '));

    const existingReversal = await this.jeRepo.findByIdempotencyKey(
      reversal.company_id,
      reversal.idempotency_key,
      tx
    );
    if (existingReversal) {
      const existingGl = await this.glRepo.queryByJournalEntryId(reversal.company_id, existingReversal.id, tx);
      return this._postingResult(existingReversal, existingGl, true, {
        reversal: true,
        reversal_of_journal_entry_id: existingReversal.reversal_of_id,
      });
    }

    const originalJe = await this._findOriginalForReversal(reversal, tx);
    if (!originalJe) throw new NotFoundError('Original posted journal entry not found for reversal.');
    if (originalJe.status !== 'POSTED') {
      throw new ValidationError('Only POSTED journal entries can be reversed.');
    }
    if (originalJe.reversed_by_id) {
      throw new ValidationError('Journal entry has already been reversed.');
    }

    const dateErrors = this.validator.validateReversalDate(originalJe.posting_date, reversal.posting_date);
    if (dateErrors.length > 0) throw new ValidationError(dateErrors.join(' | '));

    const revLocked = await this.validator.periodRepo.isLocked(reversal.company_id, reversal.posting_date, tx);
    if (revLocked) {
      throw new ValidationError(`Reversal posting date ${reversal.posting_date} falls in a locked fiscal period.`);
    }

    const originalLines = await this.jeRepo.getLines(originalJe.id, tx);
    if (!originalLines.length) throw new ValidationError('Original journal entry has no lines to reverse.');

    const reversalJe = await this.jeRepo.create(reversal.company_id, {
      posting_date: reversal.posting_date,
      description: reversal.description || `Reversal of JE ${originalJe.id}`,
      status: 'POSTED',
      source_document_type: reversal.source_document_type || originalJe.source_document_type,
      source_document_id: reversal.source_document_id || originalJe.source_document_id,
      source_document_no: reversal.source_document_no || originalJe.source_document_no,
      idempotency_key: reversal.idempotency_key,
      reversal_of_id: originalJe.id,
    }, tx);

    const reversalLinePayloads = originalLines.map(line => ({
      account_id: line.account_id,
      debit_amount: line.credit_amount,
      credit_amount: line.debit_amount,
      currency: line.currency,
      description: reversal.description || `Reversal of line ${line.id}`,
      source_document_type: reversal.source_document_type || line.source_document_type || originalJe.source_document_type,
      source_document_id: reversal.source_document_id || line.source_document_id || originalJe.source_document_id,
      source_document_no: reversal.source_document_no || line.source_document_no || originalJe.source_document_no,
      source_document_line_id: line.source_document_line_id,
      party_type: line.party_type,
      party_id: line.party_id,
      warehouse_id: line.warehouse_id,
      inventory_item_id: line.inventory_item_id,
      inventory_ledger_entry_id: line.inventory_ledger_entry_id,
      tax_metadata: line.tax_metadata || {},
    }));

    const reversalLines = await this.jeRepo.addLines(reversalJe.id, reversal.company_id, reversalLinePayloads, tx);
    const glEntries = await this.glRepo.appendBatch(reversalLines.map(line => this._toGlPayload(reversalJe, line, reversal.idempotency_key)), tx);

    // Header metadata update only. Original GL rows remain unchanged.
    await this.jeRepo.setReversedById(reversal.company_id, originalJe.id, reversalJe.id, tx);

    return this._postingResult(reversalJe, glEntries, false, {
      reversal: true,
      reversal_of_journal_entry_id: originalJe.id,
    });
  }

  async reverseAccountingDocumentStandalone(request) {
    return withTransaction(this.db, tx => this.reverseAccountingDocument(request, tx));
  }

  // ─────────────────────────────────────────────────────────────
  // BACKWARD-COMPATIBLE MANUAL JOURNAL ENTRY APIs
  // ─────────────────────────────────────────────────────────────

  async createDraft(companyId, data) {
    return withTransaction(this.db, async tx => {
      const je = await this.jeRepo.create(companyId, { ...data, status: 'DRAFT' }, tx);
      const lines = data.lines && data.lines.length
        ? await this.jeRepo.addLines(je.id, companyId, data.lines, tx)
        : [];
      return { journalEntry: je, lines };
    });
  }

  async updateDraft(companyId, journalEntryId, data) {
    return withTransaction(this.db, async tx => {
      const je = await this.jeRepo.findById(companyId, journalEntryId, tx);
      if (!je) throw new NotFoundError('Journal entry not found.');
      if (je.status !== 'DRAFT') throw new ValidationError('Only DRAFT journal entries can be updated.');

      const updated = await this.jeRepo.updateDraftHeader(companyId, journalEntryId, {
        posting_date: data.posting_date || je.posting_date,
        description: data.description ?? je.description,
        source_document_type: data.source_document_type ?? je.source_document_type,
        source_document_id: data.source_document_id ?? je.source_document_id,
        source_document_no: data.source_document_no ?? je.source_document_no,
        idempotency_key: data.idempotency_key ?? je.idempotency_key,
      }, tx);
      const lines = data.lines ? await this.jeRepo.replaceDraftLines(journalEntryId, companyId, data.lines, tx) : await this.jeRepo.getLines(journalEntryId, tx);
      return { journalEntry: updated, lines };
    });
  }

  async post(companyId, journalEntryId) {
    return withTransaction(this.db, tx => this._postDraftJournalEntry(companyId, journalEntryId, tx));
  }

  async cancel(companyId, journalEntryId, reversalData) {
    const idempotencyKey = reversalData.idempotency_key || `reversal:${companyId}:${journalEntryId}:${reversalData.posting_date}`;
    return this.reverseAccountingDocumentStandalone({
      company_id: companyId,
      journal_entry_id: journalEntryId,
      posting_date: reversalData.posting_date,
      source_document_type: reversalData.source_document_type,
      source_document_id: reversalData.source_document_id,
      source_document_no: reversalData.source_document_no,
      description: reversalData.description,
      idempotency_key: idempotencyKey,
    });
  }

  async getJournalEntry(companyId, journalEntryId) {
    const je = await this.jeRepo.findById(companyId, journalEntryId);
    if (!je) throw new NotFoundError('Journal entry not found.');
    const lines = await this.jeRepo.getLines(journalEntryId);
    return { journalEntry: je, lines };
  }

  async queryGlEntries(companyId, { fromDate, toDate, accountId }) {
    if (accountId) return this.glRepo.queryByAccount(companyId, accountId, fromDate, toDate);
    return this.glRepo.queryByCompanyAndDateRange(companyId, fromDate, toDate);
  }

  async trialBalance(companyId, fromDate, toDate) {
    return this.glRepo.trialBalance(companyId, fromDate, toDate);
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────

  async _postDraftJournalEntry(companyId, journalEntryId, tx) {
    const je = await this.jeRepo.findById(companyId, journalEntryId, tx);
    if (!je) throw new NotFoundError('Journal entry not found.');

    if (je.status === 'POSTED') {
      const glEntries = await this.glRepo.queryByJournalEntryId(companyId, je.id, tx);
      return { journalEntry: je, glEntries, idempotent: true, ...this._postingResult(je, glEntries, true) };
    }

    if (je.status === 'CANCELLED') throw new ValidationError('Cannot post a cancelled journal entry.');

    const lines = await this.jeRepo.getLines(journalEntryId, tx);
    const errors = await this.validator.validate(companyId, { posting_date: je.posting_date, lines }, tx);
    if (errors.length > 0) throw new ValidationError(errors.join(' | '));

    if (je.idempotency_key) {
      const existing = await this.glRepo.findByIdempotencyKey(companyId, je.idempotency_key, tx);
      if (existing.length > 0) {
        return { journalEntry: je, glEntries: existing, idempotent: true, ...this._postingResult(je, existing, true) };
      }
    }

    const postedJe = await this.jeRepo.updateStatus(companyId, journalEntryId, 'POSTED', tx);
    const glEntries = await this.glRepo.appendBatch(lines.map(line => this._toGlPayload(postedJe, line, je.idempotency_key)), tx);
    return { journalEntry: postedJe, glEntries, ...this._postingResult(postedJe, glEntries, false) };
  }

  async _findOriginalForReversal(request, tx) {
    if (request.journal_entry_id) {
      return this.jeRepo.findById(request.company_id, request.journal_entry_id, tx);
    }
    return this.jeRepo.findPostedBySource(
      request.company_id,
      request.source_document_type,
      request.source_document_id,
      tx
    );
  }

  _normalizePostingRequest(request = {}) {
    const lines = (request.lines || []).map(line => ({
      account_id: line.account_id,
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0,
      currency: line.currency || request.currency || 'VND',
      description: line.description || null,
      source_document_type: line.source_document_type || request.source_document_type || null,
      source_document_id: line.source_document_id || request.source_document_id || null,
      source_document_no: line.source_document_no || request.source_document_no || null,
      source_document_line_id: line.source_document_line_id || null,
      party_type: line.party_type || request.party_type || null,
      party_id: line.party_id || request.party_id || null,
      warehouse_id: line.warehouse_id || request.warehouse_id || null,
      inventory_item_id: line.inventory_item_id || request.inventory_item_id || null,
      inventory_ledger_entry_id: line.inventory_ledger_entry_id || null,
      tax_metadata: line.tax_metadata || request.tax_metadata || {},
    }));

    return {
      company_id: request.company_id,
      posting_date: request.posting_date,
      description: request.description || null,
      source_document_type: request.source_document_type,
      source_document_id: request.source_document_id,
      source_document_no: request.source_document_no || null,
      idempotency_key: request.idempotency_key,
      party_type: request.party_type || null,
      party_id: request.party_id || null,
      warehouse_id: request.warehouse_id || null,
      inventory_item_id: request.inventory_item_id || null,
      currency: request.currency || 'VND',
      tax_metadata: request.tax_metadata || {},
      inventory_gl_links: request.inventory_gl_links || [],
      lines,
    };
  }

  _normalizeReversalRequest(request = {}) {
    return {
      company_id: request.company_id,
      journal_entry_id: request.journal_entry_id || null,
      posting_date: request.posting_date || request.reversal_posting_date,
      source_document_type: request.source_document_type || null,
      source_document_id: request.source_document_id || null,
      source_document_no: request.source_document_no || null,
      description: request.description || request.reason || null,
      idempotency_key: request.idempotency_key,
    };
  }

  _validatePostContract(request) {
    const errors = [];
    if (!request.company_id) errors.push('company_id is required.');
    if (!request.posting_date) errors.push('posting_date is required.');
    if (!request.source_document_type) errors.push('source_document_type is required.');
    if (!request.source_document_id) errors.push('source_document_id is required.');
    if (!request.idempotency_key) errors.push('idempotency_key is required for postAccountingDocument.');
    if (!Array.isArray(request.lines) || request.lines.length === 0) errors.push('lines[] is required.');
    return errors;
  }

  _validateReverseContract(request) {
    const errors = [];
    if (!request.company_id) errors.push('company_id is required.');
    if (!request.posting_date) errors.push('posting_date is required for reversal.');
    if (!request.idempotency_key) errors.push('idempotency_key is required for reverseAccountingDocument.');
    if (!request.journal_entry_id && (!request.source_document_type || !request.source_document_id)) {
      errors.push('Either journal_entry_id or source_document_type + source_document_id is required for reversal.');
    }
    return errors;
  }

  _toGlPayload(je, line, idempotencyKey) {
    return {
      company_id: line.company_id || je.company_id,
      journal_entry_id: je.id,
      journal_entry_line_id: line.id,
      account_id: line.account_id,
      posting_date: je.posting_date,
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
      currency: line.currency || 'VND',
      source_document_type: line.source_document_type || je.source_document_type,
      source_document_id: line.source_document_id || je.source_document_id,
      source_document_no: line.source_document_no || je.source_document_no,
      source_document_line_id: line.source_document_line_id,
      party_type: line.party_type,
      party_id: line.party_id,
      warehouse_id: line.warehouse_id,
      inventory_item_id: line.inventory_item_id,
      inventory_ledger_entry_id: line.inventory_ledger_entry_id,
      tax_metadata: line.tax_metadata || {},
      idempotency_key: idempotencyKey || je.idempotency_key || null,
    };
  }

  _postingResult(je, glEntries, idempotent, extra = {}) {
    return {
      journal_entry_id: je.id,
      gl_entry_ids: glEntries.map(g => g.id),
      source_document_type: je.source_document_type,
      source_document_id: je.source_document_id,
      source_document_no: je.source_document_no,
      status: je.status,
      idempotent,
      ...extra,
    };
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 422;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

module.exports = { PostingService, ValidationError, NotFoundError };
