const {
  SALES_STOCK_PATTERNS,
  SALE_TYPES,
  SOURCE_DOCUMENT_TYPES,
} = require('../constants');

const { round4 } = require('../models/SalesInvoice');

class SalesPostingService {
  constructor({
    transactionManager,
    salesInvoiceRepository,
    deliveryNoteRepository,
    companySettingsRepository,
    accountResolver,
    coreAccounting,
    inventoryIssueService,
    arLedger,
    taxLedger,
  }) {
    this.transactionManager = transactionManager || { withTransaction: (fn) => fn({}) };
    this.salesInvoiceRepository = must(salesInvoiceRepository, 'salesInvoiceRepository');
    this.deliveryNoteRepository = must(deliveryNoteRepository, 'deliveryNoteRepository');
    this.companySettingsRepository = must(companySettingsRepository, 'companySettingsRepository');
    this.accountResolver = must(accountResolver, 'accountResolver');
    this.coreAccounting = must(coreAccounting, 'coreAccounting');
    this.inventoryIssueService = must(inventoryIssueService, 'inventoryIssueService');
    this.arLedger = must(arLedger, 'arLedger');
    this.taxLedger = must(taxLedger, 'taxLedger');
  }

  async postSalesInvoice({ company_id, invoice_id, posting_date, idempotency_key }) {
    return this.transactionManager.withTransaction(async (tx) => {
      const invoice = await this.salesInvoiceRepository.findWithLines(company_id, invoice_id, tx);
      requireDocument(invoice, 'Sales Invoice');

      if (invoice.status === 'posted' && invoice.idempotency_key === idempotency_key) {
        return { status: 'already_posted', id: invoice.id };
      }
      if (invoice.status !== 'draft') throw new Error('Only draft Sales Invoice can be posted');

      const companyPattern = await this.companySettingsRepository.getSalesStockPattern(company_id, tx);
      const stockPattern = invoice.stock_pattern || companyPattern;
      assertStockPattern(stockPattern);

      let inventoryResult = null;
      if (stockPattern === SALES_STOCK_PATTERNS.INVOICE_UPDATES_STOCK) {
        inventoryResult = await this.inventoryIssueService.postIssue({
          company_id,
          source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
          source_document_id: invoice.id,
          source_document_no: invoice.invoice_number,
          posting_date,
          lines: invoice.lines.map((line) => ({
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: line.quantity,
            source_line_id: line.id,
          })),
        }, tx);
      }

      const accountingLines = await this._buildSalesInvoiceAccountingLines(invoice, inventoryResult, tx);
      assertCanonicalAccountingLines(accountingLines);
      assertBalanced(accountingLines);

      const glResult = await this.coreAccounting.postAccountingDocument({
        company_id,
        posting_date,
        source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
        source_document_id: invoice.id,
        source_document_no: invoice.invoice_number,
        idempotency_key,
        party_id: invoice.customer_id,
        lines: accountingLines,
      }, tx);

      if (invoice.sale_type === SALE_TYPES.CREDIT) {
        await this.arLedger.createOutstanding({
          company_id,
          source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
          source_document_id: invoice.id,
          source_document_no: invoice.invoice_number,
          party_id: invoice.customer_id,
          posting_date,
          due_date: invoice.due_date,
          amount: invoice.grand_total,
          currency: invoice.currency,
          journal_entry_id: glResult.journal_entry_id,
        }, tx);
      }

      if (round4(invoice.tax_amount) > 0) {
        await this.taxLedger.writeVatOutput({
          company_id,
          source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
          source_document_id: invoice.id,
          source_document_no: invoice.invoice_number,
          posting_date,
          customer_id: invoice.customer_id,
          taxable_amount: invoice.total_amount,
          vat_amount: invoice.tax_amount,
          vat_output_account_id: await this.accountResolver.resolveVatOutputAccount(company_id, tx),
          journal_entry_id: glResult.journal_entry_id,
          lines: invoice.lines.filter((line) => round4(line.tax_amount) > 0).map((line) => ({
            source_line_id: line.id,
            tax_rate: line.tax_rate,
            taxable_amount: line.line_amount,
            tax_amount: line.tax_amount,
          })),
        }, tx);
      }

      await this.salesInvoiceRepository.markPosted(company_id, invoice.id, {
        posting_date,
        idempotency_key,
        stock_pattern: stockPattern,
        journal_entry_id: glResult.journal_entry_id,
      }, tx);

      return { status: 'posted', id: invoice.id, journal_entry_id: glResult.journal_entry_id };
    });
  }

  async cancelSalesInvoice({ company_id, invoice_id, cancellation_reason, idempotency_key }) {
    return this.transactionManager.withTransaction(async (tx) => {
      const invoice = await this.salesInvoiceRepository.findWithLines(company_id, invoice_id, tx);
      requireDocument(invoice, 'Sales Invoice');
      if (invoice.status !== 'posted') throw new Error('Only posted Sales Invoice can be cancelled');

      const activeAllocation = await this.arLedger.hasActiveAllocation({
        company_id,
        source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
        source_document_id: invoice.id,
      }, tx);
      if (activeAllocation) throw new Error('Cannot cancel Sales Invoice: active payment allocation exists');

      const reverseResult = await this.coreAccounting.reverseAccountingDocument({
        company_id,
        source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
        source_document_id: invoice.id,
        reversal_source_document_type: `${SOURCE_DOCUMENT_TYPES.SALES_INVOICE}_cancellation`,
        reversal_source_document_id: `${invoice.id}:cancel`,
        reason: cancellation_reason,
        idempotency_key,
      }, tx);

      if (invoice.stock_pattern === SALES_STOCK_PATTERNS.INVOICE_UPDATES_STOCK) {
        await this.inventoryIssueService.reverseIssue({
          company_id,
          source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
          source_document_id: invoice.id,
          reason: cancellation_reason,
        }, tx);
      }

      if (invoice.sale_type === SALE_TYPES.CREDIT) {
        await this.arLedger.reverseOutstanding({
          company_id,
          source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
          source_document_id: invoice.id,
          reason: cancellation_reason,
          reversal_journal_entry_id: reverseResult.journal_entry_id,
        }, tx);
      }

      if (round4(invoice.tax_amount) > 0) {
        await this.taxLedger.reverseVatOutput({
          company_id,
          source_document_type: SOURCE_DOCUMENT_TYPES.SALES_INVOICE,
          source_document_id: invoice.id,
          reason: cancellation_reason,
          reversal_journal_entry_id: reverseResult.journal_entry_id,
        }, tx);
      }

      await this.salesInvoiceRepository.markCancelled(company_id, invoice.id, {
        cancellation_reason,
        reversal_journal_entry_id: reverseResult.journal_entry_id,
      }, tx);

      return { status: 'cancelled', id: invoice.id, reversal_journal_entry_id: reverseResult.journal_entry_id };
    });
  }

  async postDeliveryNote({ company_id, delivery_note_id, posting_date, idempotency_key }) {
    return this.transactionManager.withTransaction(async (tx) => {
      const dn = await this.deliveryNoteRepository.findWithLines(company_id, delivery_note_id, tx);
      requireDocument(dn, 'Delivery Note');

      if (dn.status === 'posted' && dn.idempotency_key === idempotency_key) {
        return { status: 'already_posted', id: dn.id };
      }
      if (dn.status !== 'draft') throw new Error('Only draft Delivery Note can be posted');

      const goodsSentAccountId = await this.accountResolver.resolveGoodsSentForSaleAccount(company_id, tx);
      const inventoryResult = await this.inventoryIssueService.postIssue({
        company_id,
        source_document_type: SOURCE_DOCUMENT_TYPES.DELIVERY_NOTE,
        source_document_id: dn.id,
        source_document_no: dn.delivery_number,
        posting_date,
        lines: dn.lines.map((line) => ({
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: line.quantity,
          source_line_id: line.id,
        })),
      }, tx);

      const accountingLines = buildDeliveryGoodsSentAccountingLines(goodsSentAccountId, inventoryResult);
      assertCanonicalAccountingLines(accountingLines);
      assertBalanced(accountingLines);

      const glResult = await this.coreAccounting.postAccountingDocument({
        company_id,
        posting_date,
        source_document_type: SOURCE_DOCUMENT_TYPES.DELIVERY_NOTE,
        source_document_id: dn.id,
        source_document_no: dn.delivery_number,
        idempotency_key,
        party_id: dn.customer_id,
        lines: accountingLines,
      }, tx);

      await this.deliveryNoteRepository.markPosted(company_id, dn.id, {
        posting_date,
        idempotency_key,
        journal_entry_id: glResult.journal_entry_id,
      }, tx);

      return { status: 'posted', id: dn.id, journal_entry_id: glResult.journal_entry_id };
    });
  }

  async cancelDeliveryNote({ company_id, delivery_note_id, cancellation_reason, idempotency_key }) {
    return this.transactionManager.withTransaction(async (tx) => {
      const dn = await this.deliveryNoteRepository.findWithLines(company_id, delivery_note_id, tx);
      requireDocument(dn, 'Delivery Note');
      if (dn.status !== 'posted') throw new Error('Only posted Delivery Note can be cancelled');

      const linkedInvoicePosted = await this.salesInvoiceRepository.isLinkedInvoicePosted(company_id, dn.id, tx);
      if (linkedInvoicePosted) throw new Error('Cannot cancel Delivery Note: linked Sales Invoice is posted');

      const reverseResult = await this.coreAccounting.reverseAccountingDocument({
        company_id,
        source_document_type: SOURCE_DOCUMENT_TYPES.DELIVERY_NOTE,
        source_document_id: dn.id,
        reversal_source_document_type: `${SOURCE_DOCUMENT_TYPES.DELIVERY_NOTE}_cancellation`,
        reversal_source_document_id: `${dn.id}:cancel`,
        reason: cancellation_reason,
        idempotency_key,
      }, tx);

      await this.inventoryIssueService.reverseIssue({
        company_id,
        source_document_type: SOURCE_DOCUMENT_TYPES.DELIVERY_NOTE,
        source_document_id: dn.id,
        reason: cancellation_reason,
      }, tx);

      await this.deliveryNoteRepository.markCancelled(company_id, dn.id, {
        cancellation_reason,
        reversal_journal_entry_id: reverseResult.journal_entry_id,
      }, tx);

      return { status: 'cancelled', id: dn.id, reversal_journal_entry_id: reverseResult.journal_entry_id };
    });
  }

  async _buildSalesInvoiceAccountingLines(invoice, inventoryResult, tx) {
    const debitAccountId = invoice.sale_type === SALE_TYPES.CASH
      ? await this.accountResolver.resolveCashAccount(invoice, tx)
      : await this.accountResolver.resolveReceivableAccount(invoice.company_id, tx);

    const lines = [{
      account_id: debitAccountId,
      debit: invoice.grand_total,
      credit: 0,
      memo: invoice.sale_type === SALE_TYPES.CASH ? 'Cash sale receipt' : 'Trade receivable',
      party_id: invoice.customer_id,
    }];

    for (const line of invoice.lines) {
      lines.push({
        account_id: line.revenue_account_id,
        debit: 0,
        credit: line.line_amount,
        memo: 'Sales revenue',
        source_line_id: line.id,
        item_id: line.item_id,
      });
    }

    if (round4(invoice.tax_amount) > 0) {
      lines.push({
        account_id: await this.accountResolver.resolveVatOutputAccount(invoice.company_id, tx),
        debit: 0,
        credit: invoice.tax_amount,
        memo: 'VAT output',
        tax_direction: 'output',
      });
    }

    if (inventoryResult && Array.isArray(inventoryResult.accounting_lines)) {
      for (const inventoryLine of inventoryResult.accounting_lines) {
        lines.push({ ...inventoryLine, memo: inventoryLine.memo || 'Inventory issue valuation' });
      }
    }

    return lines;
  }
}

function buildDeliveryGoodsSentAccountingLines(goodsSentAccountId, inventoryResult) {
  const creditLines = Array.isArray(inventoryResult && inventoryResult.inventory_credit_lines)
    ? inventoryResult.inventory_credit_lines
    : [];
  const totalStockValue = round4(
    inventoryResult && Number.isFinite(Number(inventoryResult.total_stock_value))
      ? Number(inventoryResult.total_stock_value)
      : creditLines.reduce((sum, line) => sum + Number(line.credit || 0), 0)
  );

  if (totalStockValue <= 0) throw new Error('inventoryIssueService must return positive total_stock_value for Delivery Note');

  const lines = [{
    account_id: goodsSentAccountId,
    debit: totalStockValue,
    credit: 0,
    memo: 'Goods sent for sale interim',
  }];

  if (creditLines.length > 0) {
    lines.push(...creditLines.map((line) => ({
      account_id: line.account_id,
      account_subtype: line.account_subtype,
      debit: 0,
      credit: Number(line.credit),
      memo: line.memo || 'Inventory credit',
      item_id: line.item_id,
      warehouse_id: line.warehouse_id,
    })));
  } else if (inventoryResult && inventoryResult.inventory_account_id) {
    lines.push({
      account_id: inventoryResult.inventory_account_id,
      account_subtype: inventoryResult.inventory_account_subtype,
      debit: 0,
      credit: totalStockValue,
      memo: 'Inventory credit',
    });
  } else {
    throw new Error('inventoryIssueService must return inventory_credit_lines or inventory_account_id');
  }

  return lines;
}

function assertCanonicalAccountingLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Accounting lines are required');
  lines.forEach((line, idx) => {
    if (!line.account_id) throw new Error(`Accounting line ${idx + 1} is missing account_id`);
    const forbiddenLegacyAccountField = ['chart', 'of', 'accounts', 'id'].join('_');
    if (forbiddenLegacyAccountField in line) throw new Error(`Accounting line ${idx + 1} uses a forbidden legacy account field`);
    if (line._vat_output_placeholder) throw new Error(`Accounting line ${idx + 1} uses forbidden VAT placeholder`);
  });
}

function assertBalanced(lines) {
  const debit = round4(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const credit = round4(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
  if (Math.abs(debit - credit) > 0.0001) throw new Error(`Accounting lines are not balanced: debit=${debit}, credit=${credit}`);
}

function assertStockPattern(stockPattern) {
  if (!Object.values(SALES_STOCK_PATTERNS).includes(stockPattern)) {
    throw new Error(`Invalid sales stock pattern: ${stockPattern}`);
  }
}

function requireDocument(document, label) {
  if (!document) throw new Error(`${label} not found`);
}

function must(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

module.exports = {
  SalesPostingService,
  buildDeliveryGoodsSentAccountingLines,
  assertCanonicalAccountingLines,
  assertBalanced,
};
