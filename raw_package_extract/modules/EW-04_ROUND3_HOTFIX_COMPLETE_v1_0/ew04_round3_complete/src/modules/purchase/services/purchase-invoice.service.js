/**
 * EW-04 — Purchase Invoice Service
 * Architecture Freeze v1.0 / Round 2 P0 revision
 *
 * Supported stock patterns inside freeze scope:
 *
 * P1 — Purchase Invoice updates stock directly:
 *      Dr Inventory    Dr VAT Input    Cr AP/Cash/Bank
 *      EW-04 calls EW-05 stock-in inside the same transaction.
 *      No GRNI is used.
 *
 * P2 — Purchase Receipt before Purchase Invoice:
 *      Receipt: Dr Inventory Cr GRNI
 *      Invoice: Dr GRNI Dr VAT Input Cr AP/Cash/Bank
 *
 * Direct cash/bank:
 *      No AP ledger/outstanding is created.
 *      Payment Voucher settlement is not allowed because there is no AP ledger event.
 */

const { randomUUID } = require('crypto');
const { createPurchaseInvoiceSchema } = require('../validators/purchase.validators');
const { PurchaseAccountResolver } = require('./purchase-account-resolver.service');

class PurchaseInvoiceService {
  /**
   * @param {object} deps
   * @param {object} deps.db
   * @param {object} deps.inventoryService   - EW-05 stock-in contract
   * @param {object} deps.postingService     - EW-01 Core Accounting contract
   * @param {object} deps.arApService        - EW-02 AP ledger contract
   * @param {object} deps.taxService         - EW-06 VAT ledger contract
   * @param {object} deps.periodLockService  - EW-01 period lock contract
   * @param {object} [deps.accountResolver]  - PurchaseAccountResolver or compatible adapter
   */
  constructor({ db, inventoryService, postingService, arApService, taxService, periodLockService, accountResolver }) {
    this.db = db;
    this.inventoryService = inventoryService;
    this.postingService = postingService;
    this.arApService = arApService;
    this.taxService = taxService;
    this.periodLockService = periodLockService;
    this.accountResolver = accountResolver || new PurchaseAccountResolver({ db });
  }

  // -------------------------------------------------------
  // CREATE DRAFT
  // -------------------------------------------------------
  async createDraft(companyId, payload) {
    const parsed = createPurchaseInvoiceSchema.parse(payload);

    const id = randomUUID();
    let subtotal = 0;
    let taxTotal = 0;
    let receivedQty = 0;
    let receivedAmount = 0;

    const lines = parsed.lines.map((l, idx) => {
      const lineAmount = parseFloat((l.quantity * l.unit_price).toFixed(4));
      const taxAmount = parseFloat((lineAmount * l.tax_rate / 100).toFixed(4));
      subtotal += lineAmount;
      taxTotal += taxAmount;
      receivedQty += l.quantity;
      receivedAmount += lineAmount;
      return {
        id: randomUUID(),
        company_id: companyId,
        purchase_invoice_id: id,
        line_number: idx + 1,
        item_id: l.item_id,
        warehouse_id: l.warehouse_id,
        description: l.description || null,
        quantity: l.quantity,
        unit_price: l.unit_price,
        line_amount: lineAmount,
        tax_rate: l.tax_rate,
        tax_amount: taxAmount,
        purchase_receipt_id: l.purchase_receipt_id || null,
        purchase_receipt_line_id: l.purchase_receipt_line_id || null,
      };
    });

    const stockUpdatePattern = parsed.stock_update_pattern || this._detectStockPattern({ lines });

    const invoice = {
      id,
      company_id: companyId,
      supplier_id: parsed.supplier_id,
      invoice_number: parsed.invoice_number || null,
      invoice_date: parsed.invoice_date,
      posting_date: parsed.posting_date,
      due_date: parsed.due_date || null,
      status: 'draft',
      payment_method: parsed.payment_method,
      cash_bank_account_id: parsed.cash_bank_account_id || null,
      currency_code: parsed.currency_code,
      stock_update_pattern: stockUpdatePattern,
      subtotal_amount: parseFloat(subtotal.toFixed(4)),
      tax_amount: parseFloat(taxTotal.toFixed(4)),
      total_amount: parseFloat((subtotal + taxTotal).toFixed(4)),
      received_qty: parseFloat(receivedQty.toFixed(6)),
      billed_qty: parseFloat(receivedQty.toFixed(6)),
      received_amount: parseFloat(receivedAmount.toFixed(4)),
      billed_amount: parseFloat(receivedAmount.toFixed(4)),
      idempotency_key: parsed.idempotency_key || null,
      notes: parsed.notes || null,
      lines,
    };

    await this._saveDraft(invoice);
    return invoice;
  }

  // -------------------------------------------------------
  // POST INVOICE
  // -------------------------------------------------------
  async postInvoice(companyId, invoiceId) {
    return this.db.transaction(async (trx) => {
      const invoice = await this._loadInvoice(trx, companyId, invoiceId);
      if (invoice.status !== 'draft') {
        throw new Error(`INVALID_STATE: Invoice ${invoiceId} is ${invoice.status}`);
      }

      if (invoice.idempotency_key) {
        const dup = await this._findPostedByIdempotencyKey(trx, companyId, invoice.idempotency_key, invoiceId);
        if (dup) throw new Error(`DUPLICATE: idempotency_key already posted as ${dup.id}`);
      }

      await this.periodLockService.assertNotLocked(companyId, invoice.posting_date, trx);

      const stockPattern = invoice.stock_update_pattern || this._detectStockPattern(invoice);
      this._assertStockPatternConsistent(invoice, stockPattern);

      const isP2 = stockPattern === 'receipt_then_invoice';
      const isDirectCash = invoice.payment_method === 'cash' || invoice.payment_method === 'bank';

      let inventoryResult = null;
      if (!isP2) {
        inventoryResult = await this._postDirectInvoiceStockIn(companyId, invoice, trx);
      }

      const postingAccounts = await this.accountResolver.resolveInvoicePostingAccounts(
        companyId,
        invoice,
        { inventoryResult, isP2, isDirectCash },
        trx
      );

      const glLines = isP2
        ? this._buildP2GLLines(invoice, postingAccounts, isDirectCash)
        : this._buildP1GLLines(invoice, inventoryResult, postingAccounts, isDirectCash);

      this.accountResolver.assertNoMissingAccountIds(glLines, `purchase_invoice ${invoiceId}`);

      const glResult = await this._postAccountingDocument({
        company_id: companyId,
        posting_date: invoice.posting_date,
        source_document_type: 'purchase_invoice',
        source_document_id: invoiceId,
        source_document_no: invoice.invoice_number || null,
        idempotency_key: `purchase_invoice:${invoiceId}:post`,
        lines: glLines,
      }, trx);

      const taxLedgerIds = [];
      if (Number(invoice.tax_amount || 0) > 0) {
        const vatResult = await this.taxService.createPurchaseVATEntries({
          company_id: companyId,
          source_document_type: 'purchase_invoice',
          source_document_id: invoiceId,
          source_document_no: invoice.invoice_number || null,
          posting_date: invoice.posting_date,
          supplier_id: invoice.supplier_id,
          journal_entry_id: glResult.journalEntryId || glResult.journal_entry_id || null,
          vat_input_account_id: postingAccounts.vat_input_account_id,
          lines: invoice.lines,
        }, trx);
        taxLedgerIds.push(...(vatResult.taxLedgerIds || vatResult.tax_ledger_ids || []));
      }

      let arApLedgerIds = [];
      if (!isDirectCash) {
        const apResult = await this.arApService.createApEntry({
          company_id: companyId,
          source_document_type: 'purchase_invoice',
          source_document_id: invoiceId,
          party_id: invoice.supplier_id,
          amount: invoice.total_amount,
          posting_date: invoice.posting_date,
          due_date: invoice.due_date,
          journal_entry_id: glResult.journalEntryId || glResult.journal_entry_id || null,
        }, trx);
        arApLedgerIds = apResult.ledgerIds || apResult.ledger_ids || [];
      }

      await trx('purchase_invoices')
        .where({ id: invoiceId, company_id: companyId })
        .update({ status: 'posted', posted_at: new Date() });

      if (isP2) {
        await this._updateReceiptLineBilledQty(trx, companyId, invoice.lines);
      }

      return {
        success: true,
        documentId: invoiceId,
        stockUpdatePattern: stockPattern,
        journalEntryId: glResult.journalEntryId || glResult.journal_entry_id || null,
        glEntryIds: glResult.entryIds || glResult.entry_ids || [],
        inventoryLedgerIds: inventoryResult ? this._extractInventoryLedgerIds(inventoryResult) : [],
        arApLedgerIds,
        taxLedgerIds,
        isDirectCash,
        apOutstandingCreated: !isDirectCash,
        paymentVoucherSettlementAllowed: !isDirectCash,
      };
    });
  }

  // -------------------------------------------------------
  // CANCEL INVOICE
  // -------------------------------------------------------
  async cancelInvoice(companyId, invoiceId) {
    return this.db.transaction(async (trx) => {
      const invoice = await this._loadInvoice(trx, companyId, invoiceId);
      if (invoice.status !== 'posted') {
        throw new Error(`INVALID_STATE: Invoice ${invoiceId} is ${invoice.status}`);
      }

      const stockPattern = invoice.stock_update_pattern || this._detectStockPattern(invoice);
      this._assertStockPatternConsistent(invoice, stockPattern);

      const isP2 = stockPattern === 'receipt_then_invoice';
      const isDirectCash = invoice.payment_method === 'cash' || invoice.payment_method === 'bank';
      if (!isDirectCash) {
        await this.arApService.assertNoActiveAllocation(companyId, 'purchase_invoice', invoiceId, trx);
      }

      await this.periodLockService.assertNotLocked(companyId, invoice.posting_date, trx);

      let inventoryReversal = null;
      if (!isP2) {
        inventoryReversal = await this._reverseDirectInvoiceStockIn(companyId, invoice, trx);
      }

      const glReversal = await this._reverseAccountingDocument({
        company_id: companyId,
        posting_date: invoice.posting_date,
        source_document_type: 'purchase_invoice',
        source_document_id: invoiceId,
        reversal_of_source_document_type: 'purchase_invoice',
        reversal_of_source_document_id: invoiceId,
        idempotency_key: `purchase_invoice:${invoiceId}:reverse`,
      }, trx);

      if (!isDirectCash) {
        await this.arApService.createApReversalEntry({
          company_id: companyId,
          source_document_type: 'purchase_invoice',
          source_document_id: invoiceId,
          reversal_of_source_document_id: invoiceId,
        }, trx);
      }

      if (Number(invoice.tax_amount || 0) > 0) {
        await this.taxService.reversePurchaseVATEntries({
          company_id: companyId,
          source_document_type: 'purchase_invoice',
          source_document_id: invoiceId,
          posting_date: invoice.posting_date,
          reversal_of_source_document_id: invoiceId,
        }, trx);
      }

      const reversalId = randomUUID();
      await trx('purchase_invoices').insert({
        id: reversalId,
        company_id: companyId,
        supplier_id: invoice.supplier_id,
        invoice_date: invoice.invoice_date,
        posting_date: invoice.posting_date,
        status: 'posted',
        payment_method: invoice.payment_method,
        cash_bank_account_id: invoice.cash_bank_account_id || null,
        currency_code: invoice.currency_code,
        stock_update_pattern: stockPattern,
        subtotal_amount: -invoice.subtotal_amount,
        tax_amount: -invoice.tax_amount,
        total_amount: -invoice.total_amount,
        received_qty: -invoice.received_qty,
        billed_qty: -invoice.billed_qty,
        received_amount: -invoice.received_amount,
        billed_amount: -invoice.billed_amount,
        reversal_of_id: invoiceId,
        posted_at: new Date(),
      });

      await trx('purchase_invoices')
        .where({ id: invoiceId, company_id: companyId })
        .update({ status: 'cancelled', cancelled_at: new Date() });

      return {
        success: true,
        documentId: invoiceId,
        stockUpdatePattern: stockPattern,
        reversalDocumentId: reversalId,
        glReversalIds: glReversal.entryIds || glReversal.entry_ids || [],
        inventoryReversalIds: inventoryReversal ? this._extractInventoryLedgerIds(inventoryReversal) : [],
      };
    });
  }

  // -------------------------------------------------------
  // STOCK PATTERN / EW-05 CONTRACT HELPERS
  // -------------------------------------------------------

  _detectStockPattern(invoice) {
    const lines = invoice.lines || [];
    const fullReceiptLinks = lines.map((line) => Boolean(line.purchase_receipt_id && line.purchase_receipt_line_id));
    const anyReceiptLinks = lines.map((line) => Boolean(line.purchase_receipt_id || line.purchase_receipt_line_id));

    if (anyReceiptLinks.some(Boolean) && !fullReceiptLinks.every(Boolean)) {
      throw new Error('INVALID_SCOPE: P2 receipt-before-invoice lines must include both purchase_receipt_id and purchase_receipt_line_id');
    }
    if (fullReceiptLinks.every(Boolean)) return 'receipt_then_invoice';
    if (anyReceiptLinks.every((v) => !v)) return 'direct_invoice_stock';
    throw new Error('INVALID_SCOPE: Do not mix P1 direct-stock and P2 receipt-linked lines in one Purchase Invoice');
  }

  _assertStockPatternConsistent(invoice, stockPattern) {
    if (!['direct_invoice_stock', 'receipt_then_invoice'].includes(stockPattern)) {
      throw new Error(`INVALID_SCOPE: Unknown purchase stock_update_pattern=${stockPattern}`);
    }
    const detected = this._detectStockPattern(invoice);
    if (detected !== stockPattern) {
      throw new Error(
        `INVALID_SCOPE: purchase invoice line links imply ${detected}, but header stock_update_pattern=${stockPattern}`
      );
    }
  }

  async _postDirectInvoiceStockIn(companyId, invoice, trx) {
    const normalizedLines = (invoice.lines || []).map((line) => ({
      ...line,
      invoice_line_id: line.id,
      source_document_line_id: line.id,
      unit_cost: line.unit_price,
    }));

    if (this.inventoryService && typeof this.inventoryService.postPurchaseInvoiceStockIn === 'function') {
      return this.inventoryService.postPurchaseInvoiceStockIn(companyId, invoice.id, normalizedLines, invoice.posting_date, trx);
    }
    if (this.inventoryService && typeof this.inventoryService.processDirectPurchaseInvoiceStockIn === 'function') {
      return this.inventoryService.processDirectPurchaseInvoiceStockIn(companyId, invoice.id, normalizedLines, invoice.posting_date, trx);
    }
    if (this.inventoryService && typeof this.inventoryService.processReceiptLines === 'function') {
      return this.inventoryService.processReceiptLines(companyId, invoice.id, normalizedLines, invoice.posting_date, trx);
    }

    throw new Error(
      'CONTRACT_MISSING: EW-05 inventoryService.postPurchaseInvoiceStockIn(companyId, invoiceId, lines, postingDate, tx) is required for P1 direct-stock Purchase Invoice'
    );
  }

  async _reverseDirectInvoiceStockIn(companyId, invoice, trx) {
    const normalizedLines = (invoice.lines || []).map((line) => ({
      ...line,
      invoice_line_id: line.id,
      source_document_line_id: line.id,
      unit_cost: line.unit_price,
    }));

    if (this.inventoryService && typeof this.inventoryService.reversePurchaseInvoiceStockIn === 'function') {
      return this.inventoryService.reversePurchaseInvoiceStockIn(companyId, invoice.id, normalizedLines, invoice.posting_date, trx);
    }
    if (this.inventoryService && typeof this.inventoryService.reverseDirectPurchaseInvoiceStockIn === 'function') {
      return this.inventoryService.reverseDirectPurchaseInvoiceStockIn(companyId, invoice.id, normalizedLines, invoice.posting_date, trx);
    }
    if (this.inventoryService && typeof this.inventoryService.reverseReceiptLines === 'function') {
      return this.inventoryService.reverseReceiptLines(companyId, invoice.id, normalizedLines, invoice.posting_date, trx);
    }

    throw new Error(
      'CONTRACT_MISSING: EW-05 inventoryService.reversePurchaseInvoiceStockIn(companyId, invoiceId, lines, postingDate, tx) is required for P1 direct-stock Purchase Invoice cancellation'
    );
  }

  _extractInventoryLedgerIds(inventoryResult) {
    return inventoryResult.ledgerEntryIds || inventoryResult.ledger_entry_ids || inventoryResult.inventoryLedgerIds || inventoryResult.inventory_ledger_ids || [];
  }

  // -------------------------------------------------------
  // GL LINE BUILDERS
  // -------------------------------------------------------

  _buildP1GLLines(invoice, inventoryResult, accounts, isDirectCash) {
    const lines = [];
    for (const lineResult of inventoryResult.lineResults || []) {
      const invoiceLineId = this._getInventoryLineInvoiceLineId(lineResult);
      const line = (invoice.lines || []).find((l) => l.id === invoiceLineId) || {};
      const lineAccount = accounts.lineAccounts.get(invoiceLineId);
      const amount = Number(lineResult.stock_value_difference ?? lineResult.stock_value ?? line.line_amount ?? 0);

      lines.push({
        account_id: lineAccount?.inventory_account_id,
        account_subtype: lineAccount?.inventory_account_subtype,
        debit: amount,
        credit: 0,
        source_document_line_id: invoiceLineId,
        party_type: null,
        party_id: null,
        item_id: line.item_id || null,
        warehouse_id: line.warehouse_id || null,
        stock_update_pattern: 'direct_invoice_stock',
      });
    }

    if (Number(invoice.tax_amount || 0) > 0) {
      lines.push(this._buildVATInputLine(invoice, accounts));
    }

    lines.push(this._buildSettlementCreditLine(invoice, accounts, isDirectCash));
    return lines;
  }

  _buildP2GLLines(invoice, accounts, isDirectCash) {
    const lines = [];
    for (const line of invoice.lines || []) {
      const lineAccount = accounts.lineAccounts.get(line.id);
      lines.push({
        account_id: lineAccount?.grni_account_id,
        account_subtype: lineAccount?.grni_account_subtype,
        debit: line.line_amount,
        credit: 0,
        source_document_line_id: line.id,
        party_type: 'supplier',
        party_id: invoice.supplier_id,
        item_id: line.item_id,
        warehouse_id: line.warehouse_id,
        clears_source_document_type: 'purchase_receipt',
        clears_source_document_id: line.purchase_receipt_id,
        clears_source_document_line_id: line.purchase_receipt_line_id || null,
        stock_update_pattern: 'receipt_then_invoice',
      });
    }

    if (Number(invoice.tax_amount || 0) > 0) {
      lines.push(this._buildVATInputLine(invoice, accounts));
    }

    lines.push(this._buildSettlementCreditLine(invoice, accounts, isDirectCash));
    return lines;
  }

  _buildVATInputLine(invoice, accounts) {
    return {
      account_id: accounts.vat_input_account_id,
      account_subtype: accounts.vat_input_account_subtype,
      debit: invoice.tax_amount,
      credit: 0,
      source_document_line_id: null,
      party_type: 'supplier',
      party_id: invoice.supplier_id,
      tax_direction: 'input',
      tax_amount: invoice.tax_amount,
    };
  }

  _buildSettlementCreditLine(invoice, accounts, isDirectCash) {
    return {
      account_id: accounts.settlement_account_id,
      account_subtype: accounts.settlement_account_subtype,
      debit: 0,
      credit: invoice.total_amount,
      source_document_line_id: null,
      party_type: isDirectCash ? null : 'supplier',
      party_id: isDirectCash ? null : invoice.supplier_id,
      settlement_kind: accounts.settlement_kind,
      ap_outstanding_created: !isDirectCash,
    };
  }

  _getInventoryLineInvoiceLineId(lineResult) {
    return lineResult.invoice_line_id || lineResult.source_document_line_id || lineResult.line_id || lineResult.receipt_line_id;
  }

  // -------------------------------------------------------
  // EW-01 CONTRACT HELPERS
  // -------------------------------------------------------
  async _postAccountingDocument(request, trx) {
    if (!this.postingService || typeof this.postingService.postAccountingDocument !== 'function') {
      throw new Error('CONTRACT_MISSING: EW-01 postingService.postAccountingDocument(request, tx) is required');
    }
    return this.postingService.postAccountingDocument(request, trx);
  }

  async _reverseAccountingDocument(request, trx) {
    if (!this.postingService || typeof this.postingService.reverseAccountingDocument !== 'function') {
      throw new Error('CONTRACT_MISSING: EW-01 postingService.reverseAccountingDocument(request, tx) is required');
    }
    return this.postingService.reverseAccountingDocument(request, trx);
  }

  // -------------------------------------------------------
  // DB HELPERS
  // -------------------------------------------------------
  async _saveDraft(invoice) {
    await this.db.transaction(async (trx) => {
      const { lines, ...header } = invoice;
      await trx('purchase_invoices').insert(header);
      if (lines.length) await trx('purchase_invoice_lines').insert(lines);
    });
  }

  async _loadInvoice(trx, companyId, invoiceId) {
    const header = await trx('purchase_invoices')
      .where({ id: invoiceId, company_id: companyId })
      .first();
    if (!header) throw new Error(`NOT_FOUND: PurchaseInvoice ${invoiceId}`);
    const lines = await trx('purchase_invoice_lines')
      .where({ purchase_invoice_id: invoiceId, company_id: companyId })
      .orderBy('line_number');
    return { ...header, lines };
  }

  async _findPostedByIdempotencyKey(trx, companyId, key, excludeId) {
    return trx('purchase_invoices')
      .where({ company_id: companyId, idempotency_key: key, status: 'posted' })
      .whereNot({ id: excludeId })
      .first();
  }

  async _updateReceiptLineBilledQty(trx, companyId, invoiceLines) {
    for (const line of invoiceLines) {
      if (!line.purchase_receipt_line_id) continue;
      await trx('purchase_receipt_lines')
        .where({ id: line.purchase_receipt_line_id, company_id: companyId })
        .increment('billed_qty', line.quantity);
    }
  }
}

module.exports = { PurchaseInvoiceService };
