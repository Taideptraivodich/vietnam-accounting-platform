/**
 * EW-04 — Purchase Receipt Service
 * Architecture Freeze v1.0 / Targeted Revision P0
 *
 * Boundary:
 * - Purchase Receipt is the purchase-owned receiving document.
 * - Inventory Receipt is inventory-owned generic adjustment/receipt; EW-04 does not duplicate it.
 * - Inventory service owns stock movement; Purchase uses its result to compose accounting.
 * - Core Accounting (EW-01) is the only GL writer via postAccountingDocument.
 *
 * Receipt posting pattern:
 *   Dr Inventory / Warehouse
 *     Cr GRNI liability/payable clearing
 */

const { randomUUID } = require('crypto');
const { createPurchaseReceiptSchema } = require('../validators/purchase.validators');
const { PurchaseAccountResolver } = require('./purchase-account-resolver.service');

class PurchaseReceiptService {
  /**
   * @param {object} deps
   * @param {object} deps.db
   * @param {object} deps.inventoryService  - EW-05 contract
   * @param {object} deps.postingService    - EW-01 Core Accounting contract
   * @param {object} deps.periodLockService - EW-01 period lock contract
   * @param {object} [deps.accountResolver] - PurchaseAccountResolver or compatible adapter
   */
  constructor({ db, inventoryService, postingService, periodLockService, accountResolver }) {
    this.db = db;
    this.inventoryService = inventoryService;
    this.postingService = postingService;
    this.periodLockService = periodLockService;
    this.accountResolver = accountResolver || new PurchaseAccountResolver({ db });
  }

  // -------------------------------------------------------
  // CREATE DRAFT
  // -------------------------------------------------------
  async createDraft(companyId, payload) {
    const parsed = createPurchaseReceiptSchema.parse(payload);

    const id = randomUUID();
    let total = 0;
    const lines = parsed.lines.map((l, idx) => {
      const lineAmount = parseFloat((l.quantity * l.unit_cost).toFixed(4));
      total += lineAmount;
      return {
        id: randomUUID(),
        company_id: companyId,
        purchase_receipt_id: id,
        line_number: idx + 1,
        item_id: l.item_id,
        warehouse_id: l.warehouse_id,
        description: l.description || null,
        quantity: l.quantity,
        unit_cost: l.unit_cost,
        line_amount: lineAmount,
        billed_qty: 0,
      };
    });

    const receipt = {
      id,
      company_id: companyId,
      supplier_id: parsed.supplier_id,
      receipt_number: parsed.receipt_number || null,
      receipt_date: parsed.receipt_date,
      posting_date: parsed.posting_date,
      status: 'draft',
      currency_code: parsed.currency_code,
      total_amount: parseFloat(total.toFixed(4)),
      idempotency_key: parsed.idempotency_key || null,
      notes: parsed.notes || null,
      lines,
    };

    await this._saveDraft(receipt);
    return receipt;
  }

  // -------------------------------------------------------
  // POST RECEIPT  (P2 pattern: Dr Inventory Cr GRNI)
  // -------------------------------------------------------
  async postReceipt(companyId, receiptId) {
    return this.db.transaction(async (trx) => {
      const receipt = await this._loadReceipt(trx, companyId, receiptId);
      if (receipt.status !== 'draft') {
        throw new Error(`INVALID_STATE: Receipt ${receiptId} is ${receipt.status}, expected draft`);
      }

      if (receipt.idempotency_key) {
        const existing = await this._findPostedByIdempotencyKey(trx, companyId, receipt.idempotency_key, receiptId);
        if (existing) throw new Error(`DUPLICATE: idempotency_key already posted as ${existing.id}`);
      }

      await this.periodLockService.assertNotLocked(companyId, receipt.posting_date, trx);

      const inventoryResult = await this.inventoryService.processReceiptLines(
        companyId,
        receiptId,
        receipt.lines,
        receipt.posting_date,
        trx
      );

      const postingAccounts = await this.accountResolver.resolveReceiptPostingAccounts(
        companyId,
        receipt,
        inventoryResult,
        trx
      );
      const glLines = this._buildReceiptGLLines(receipt, inventoryResult, postingAccounts);
      this.accountResolver.assertNoMissingAccountIds(glLines, `purchase_receipt ${receiptId}`);

      const glResult = await this._postAccountingDocument({
        company_id: companyId,
        posting_date: receipt.posting_date,
        source_document_type: 'purchase_receipt',
        source_document_id: receiptId,
        source_document_no: receipt.receipt_number || null,
        idempotency_key: `purchase_receipt:${receiptId}:post`,
        lines: glLines,
      }, trx);

      await trx('purchase_receipts')
        .where({ id: receiptId, company_id: companyId })
        .update({ status: 'posted', posted_at: new Date() });

      return {
        success: true,
        documentId: receiptId,
        journalEntryId: glResult.journalEntryId || glResult.journal_entry_id || null,
        glEntryIds: glResult.entryIds || glResult.entry_ids || [],
        inventoryLedgerIds: inventoryResult.ledgerEntryIds || inventoryResult.ledger_entry_ids || [],
      };
    });
  }

  // -------------------------------------------------------
  // CANCEL RECEIPT
  // Rules: can only cancel after Purchase Invoice is cancelled first.
  // -------------------------------------------------------
  async cancelReceipt(companyId, receiptId) {
    return this.db.transaction(async (trx) => {
      const receipt = await this._loadReceipt(trx, companyId, receiptId);
      if (receipt.status !== 'posted') {
        throw new Error(`INVALID_STATE: Receipt ${receiptId} is ${receipt.status}, expected posted`);
      }

      await this._assertNoActivePurchaseInvoice(trx, companyId, receiptId);
      await this.periodLockService.assertNotLocked(companyId, receipt.posting_date, trx);

      const inventoryReversal = await this.inventoryService.reverseReceiptLines(
        companyId,
        receiptId,
        receipt.lines,
        receipt.posting_date,
        trx
      );

      const glReversal = await this._reverseAccountingDocument({
        company_id: companyId,
        posting_date: receipt.posting_date,
        source_document_type: 'purchase_receipt',
        source_document_id: receiptId,
        reversal_of_source_document_type: 'purchase_receipt',
        reversal_of_source_document_id: receiptId,
        idempotency_key: `purchase_receipt:${receiptId}:reverse`,
      }, trx);

      const reversalId = randomUUID();
      await trx('purchase_receipts').insert({
        id: reversalId,
        company_id: companyId,
        supplier_id: receipt.supplier_id,
        receipt_date: receipt.receipt_date,
        posting_date: receipt.posting_date,
        status: 'posted',
        currency_code: receipt.currency_code,
        total_amount: -receipt.total_amount,
        reversal_of_id: receiptId,
        posted_at: new Date(),
      });

      await trx('purchase_receipts')
        .where({ id: receiptId, company_id: companyId })
        .update({ status: 'cancelled', cancelled_at: new Date() });

      return {
        success: true,
        documentId: receiptId,
        reversalDocumentId: reversalId,
        glReversalIds: glReversal.entryIds || glReversal.entry_ids || [],
        inventoryReversalIds: inventoryReversal.ledgerEntryIds || inventoryReversal.ledger_entry_ids || [],
      };
    });
  }

  // -------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------

  _buildReceiptGLLines(receipt, inventoryResult, accounts) {
    const lines = [];
    for (const lineResult of inventoryResult.lineResults || []) {
      const lineAccount = accounts.lineAccounts.get(lineResult.receipt_line_id);
      const receiptLine = (receipt.lines || []).find((l) => l.id === lineResult.receipt_line_id) || {};
      const svd = lineResult.stock_value_difference;

      lines.push({
        account_id: lineAccount?.inventory_account_id,
        account_subtype: lineAccount?.inventory_account_subtype,
        debit: svd,
        credit: 0,
        source_document_line_id: lineResult.receipt_line_id,
        party_type: null,
        party_id: null,
        item_id: receiptLine.item_id || null,
        warehouse_id: receiptLine.warehouse_id || null,
      });

      lines.push({
        account_id: lineAccount?.grni_account_id,
        account_subtype: lineAccount?.grni_account_subtype,
        debit: 0,
        credit: svd,
        source_document_line_id: lineResult.receipt_line_id,
        party_type: 'supplier',
        party_id: receipt.supplier_id,
        item_id: receiptLine.item_id || null,
        warehouse_id: receiptLine.warehouse_id || null,
        clearing_role: 'goods_received_not_invoiced',
      });
    }
    return lines;
  }

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

  async _saveDraft(receipt) {
    await this.db.transaction(async (trx) => {
      const { lines, ...header } = receipt;
      await trx('purchase_receipts').insert(header);
      if (lines.length) await trx('purchase_receipt_lines').insert(lines);
    });
  }

  async _loadReceipt(trx, companyId, receiptId) {
    const header = await trx('purchase_receipts')
      .where({ id: receiptId, company_id: companyId })
      .first();
    if (!header) throw new Error(`NOT_FOUND: PurchaseReceipt ${receiptId}`);

    const lines = await trx('purchase_receipt_lines')
      .where({ purchase_receipt_id: receiptId, company_id: companyId })
      .orderBy('line_number');

    return { ...header, lines };
  }

  async _findPostedByIdempotencyKey(trx, companyId, key, excludeId) {
    return trx('purchase_receipts')
      .where({ company_id: companyId, idempotency_key: key, status: 'posted' })
      .whereNot({ id: excludeId })
      .first();
  }

  async _assertNoActivePurchaseInvoice(trx, companyId, receiptId) {
    const active = await trx('purchase_invoice_lines as pil')
      .join('purchase_invoices as pi', 'pi.id', 'pil.purchase_invoice_id')
      .where({
        'pil.company_id': companyId,
        'pil.purchase_receipt_id': receiptId,
        'pi.status': 'posted',
      })
      .first();
    if (active) {
      throw new Error(
        `CANCEL_BLOCKED: Active Purchase Invoice ${active.purchase_invoice_id} references this Receipt. Cancel invoice first.`
      );
    }
  }
}

module.exports = { PurchaseReceiptService };
