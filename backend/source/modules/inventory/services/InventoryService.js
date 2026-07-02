'use strict';

const crypto = require('crypto');

class InventoryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'InventoryError';
    this.code = code;
    this.details = details;
  }
}

function assertRequired(value, field) {
  if (value === undefined || value === null || value === '') {
    throw new InventoryError('VALIDATION_ERROR', `${field} is required`, { field });
  }
}

function assertPositiveNumber(value, field) {
  assertRequired(value, field);
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new InventoryError('VALIDATION_ERROR', `${field} must be a positive number`, { field, value });
  }
}

function assertNonZeroNumber(value, field) {
  assertRequired(value, field);
  if (!Number.isFinite(Number(value)) || Number(value) === 0) {
    throw new InventoryError('VALIDATION_ERROR', `${field} must be a non-zero number`, { field, value });
  }
}

function roundQty(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function roundRate(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

function toMinorUnits(value) {
  const rounded = Math.round(Number(value));
  if (!Number.isSafeInteger(rounded)) {
    throw new InventoryError('GL_AMOUNT_OUT_OF_RANGE', 'GL amount must fit in a safe integer minor-unit value', { value });
  }
  if (Number(value) !== 0 && rounded === 0) {
    throw new InventoryError('GL_MINOR_UNIT_ROUNDING_ZERO', 'Non-zero inventory value difference rounds to zero minor units', { value });
  }
  return rounded;
}

function max(value, floor) {
  return value > floor ? value : floor;
}

function makeUuid() {
  return crypto.randomUUID();
}

function normalizePostingTime(value) {
  return value || '00:00:00';
}

function comparePostingTimestamp(a, b) {
  const da = String(a.posting_date || a.postingDate);
  const db = String(b.posting_date || b.postingDate);
  if (da < db) return -1;
  if (da > db) return 1;
  const ta = String(a.posting_time || a.postingTime || '00:00:00');
  const tb = String(b.posting_time || b.postingTime || '00:00:00');
  if (ta < tb) return -1;
  if (ta > tb) return 1;
  return 0;
}

class InventoryService {
  constructor({ inventoryRepository, accountingEngine, transactionManager } = {}) {
    assertRequired(inventoryRepository, 'inventoryRepository');
    assertRequired(accountingEngine, 'accountingEngine');
    if (typeof accountingEngine.postAccountingDocument !== 'function') {
      throw new InventoryError(
        'ACCOUNTING_ENGINE_CONTRACT_MISMATCH',
        'EW-05 requires EW-01 accountingEngine.postAccountingDocument(request, tx)'
      );
    }
    this.inventoryRepository = inventoryRepository;
    this.accountingEngine = accountingEngine;
    this.transactionManager = transactionManager || {
      runInTransaction: async (fn) => fn(undefined),
    };
  }

  async postOpeningStock(input) {
    this.#assertCommon(input);
    assertPositiveNumber(input.quantity, 'quantity');
    assertRequired(input.openingStockOffsetAccountId, 'openingStockOffsetAccountId');
    assertRequired(input.inventoryAccountId, 'inventoryAccountId');
    if (input.isSetupPeriod !== true) {
      throw new InventoryError('OPENING_PERIOD_REQUIRED', 'Opening Stock is allowed only in setup/opening period');
    }

    return this.transactionManager.runInTransaction(async (tx) => {
      await this.#assertNoExistingStock(input, tx);
      return this.#postMovement({
        ...input,
        movementType: 'opening_stock',
        quantityChange: Number(input.quantity),
        valuationRateInput: Number(input.valuationRate),
        offsetAccountId: input.openingStockOffsetAccountId,
        glRequired: true,
      }, tx);
    });
  }

  async postReceipt(input) {
    this.#assertCommon(input);
    assertPositiveNumber(input.quantity, 'quantity');
    assertRequired(input.inventoryAccountId, 'inventoryAccountId');
    assertRequired(input.offsetAccountId, 'offsetAccountId');
    assertPositiveNumber(input.valuationRate, 'valuationRate');

    return this.transactionManager.runInTransaction(async (tx) => this.#postMovement({
      ...input,
      movementType: 'receipt',
      quantityChange: Number(input.quantity),
      valuationRateInput: Number(input.valuationRate),
      glRequired: true,
    }, tx));
  }

  async postIssue(input) {
    this.#assertCommon(input);
    assertPositiveNumber(input.quantity, 'quantity');
    assertRequired(input.inventoryAccountId, 'inventoryAccountId');
    assertRequired(input.offsetAccountId, 'offsetAccountId');

    return this.transactionManager.runInTransaction(async (tx) => this.#postMovement({
      ...input,
      movementType: 'issue',
      quantityChange: -Number(input.quantity),
      valuationRateInput: undefined,
      glRequired: true,
    }, tx));
  }

  async postInventoryAdjustment(input) {
    this.#assertCommon(input);
    assertNonZeroNumber(input.quantityChange, 'quantityChange');
    assertRequired(input.adjustmentReason, 'adjustmentReason');
    if (!String(input.adjustmentReason).trim()) {
      throw new InventoryError('ADJUSTMENT_REASON_REQUIRED', 'Inventory Adjustment requires a non-empty adjustment reason');
    }
    assertRequired(input.offsetAccountId, 'offsetAccountId');
    assertRequired(input.inventoryAccountId, 'inventoryAccountId');
    if (Number(input.quantityChange) > 0) {
      assertPositiveNumber(input.valuationRate, 'valuationRate');
    }

    return this.transactionManager.runInTransaction(async (tx) => this.#postMovement({
      ...input,
      movementType: 'inventory_adjustment',
      quantityChange: Number(input.quantityChange),
      valuationRateInput: input.valuationRate === undefined ? undefined : Number(input.valuationRate),
      glRequired: true,
    }, tx));
  }

  async postWarehouseTransfer(input) {
    assertRequired(input.companyId, 'companyId');
    assertRequired(input.itemId, 'itemId');
    assertRequired(input.fromWarehouseId, 'fromWarehouseId');
    assertRequired(input.toWarehouseId, 'toWarehouseId');
    assertRequired(input.postingDate, 'postingDate');
    assertRequired(input.sourceDocumentType, 'sourceDocumentType');
    assertRequired(input.sourceDocumentId, 'sourceDocumentId');
    assertPositiveNumber(input.quantity, 'quantity');
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new InventoryError('VALIDATION_ERROR', 'fromWarehouseId and toWarehouseId must be different');
    }

    return this.transactionManager.runInTransaction(async (tx) => {
      const transferGroupId = input.transferGroupId || makeUuid();
      const outEntryId = makeUuid();
      const inEntryId = makeUuid();

      const out = await this.#postMovement({
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.fromWarehouseId,
        postingDate: input.postingDate,
        postingTime: input.postingTime,
        sourceDocumentType: input.sourceDocumentType,
        sourceDocumentId: input.sourceDocumentId,
        sourceDocumentLineId: input.sourceDocumentLineId,
        movementType: 'transfer_out',
        quantityChange: -Number(input.quantity),
        inventoryLedgerEntryId: outEntryId,
        transferGroupId,
        transferPairId: inEntryId,
        glRequired: false,
      }, tx);

      const stockValueDifference = Math.abs(out.entry.stock_value_difference);
      const targetBalance = await this.inventoryRepository.getStockBalance({
        companyId: input.companyId,
        itemId: input.itemId,
        warehouseId: input.toWarehouseId,
        tx,
      });

      const newQty = roundQty(targetBalance.actual_qty + Number(input.quantity));
      const newValue = roundMoney(targetBalance.stock_value + stockValueDifference);
      const newRate = newQty === 0 ? 0 : roundRate(newValue / newQty);
      const inEntry = {
        id: inEntryId,
        company_id: input.companyId,
        item_id: input.itemId,
        warehouse_id: input.toWarehouseId,
        posting_date: input.postingDate,
        posting_time: normalizePostingTime(input.postingTime),
        source_document_type: input.sourceDocumentType,
        source_document_id: input.sourceDocumentId,
        source_document_line_id: input.sourceDocumentLineId || null,
        movement_type: 'transfer_in',
        quantity_change: roundQty(Number(input.quantity)),
        qty_after_transaction: newQty,
        valuation_rate: newRate,
        stock_value: newValue,
        stock_value_difference: stockValueDifference,
        transfer_group_id: transferGroupId,
        transfer_pair_id: outEntryId,
        is_reversal: false,
        reverses_inventory_ledger_entry_id: null,
      };

      await this.#assertNoLaterEntry(inEntry, tx);
      await this.#insertLedgerAndBalance(inEntry, tx);

      return { transferGroupId, sourceEntry: out.entry, targetEntry: inEntry };
    });
  }

  async cancelInventoryEntry(input) {
    assertRequired(input.inventoryLedgerEntryId, 'inventoryLedgerEntryId');
    assertRequired(input.companyId, 'companyId');
    assertRequired(input.postingDate, 'postingDate');
    assertRequired(input.sourceDocumentType, 'sourceDocumentType');
    assertRequired(input.sourceDocumentId, 'sourceDocumentId');
    assertRequired(input.reason, 'reason');

    return this.transactionManager.runInTransaction(async (tx) => {
      const original = await this.inventoryRepository.getLedgerEntryById(input.inventoryLedgerEntryId, tx);
      if (!original) {
        throw new InventoryError('NOT_FOUND', 'Inventory ledger entry not found', { id: input.inventoryLedgerEntryId });
      }
      if (original.is_reversal) {
        throw new InventoryError('VALIDATION_ERROR', 'Cannot cancel a reversal inventory ledger entry');
      }
      const reversal = await this.#postMovement({
        companyId: original.company_id,
        itemId: original.item_id,
        warehouseId: original.warehouse_id,
        postingDate: input.postingDate,
        postingTime: input.postingTime,
        sourceDocumentType: input.sourceDocumentType,
        sourceDocumentId: input.sourceDocumentId,
        sourceDocumentLineId: original.source_document_line_id,
        movementType: 'reversal',
        quantityChange: -Number(original.quantity_change),
        valuationRateInput: Number(original.valuation_rate),
        inventoryLedgerEntryId: makeUuid(),
        isReversal: true,
        reversesInventoryLedgerEntryId: original.id,
        inventoryAccountId: input.inventoryAccountId,
        offsetAccountId: input.offsetAccountId,
        glRequired: Boolean(input.inventoryAccountId && input.offsetAccountId),
      }, tx);

      return reversal;
    });
  }

  async rebuildStockBalance({ companyId, itemId, warehouseId } = {}) {
    assertRequired(companyId, 'companyId');
    assertRequired(itemId, 'itemId');
    assertRequired(warehouseId, 'warehouseId');
    const entries = await this.inventoryRepository.listLedgerEntries({ companyId, itemId, warehouseId });
    const sorted = [...entries].sort(comparePostingTimestamp);
    const last = sorted.at(-1);
    const rebuilt = {
      company_id: companyId,
      item_id: itemId,
      warehouse_id: warehouseId,
      actual_qty: last ? Number(last.qty_after_transaction) : 0,
      stock_value: last ? Number(last.stock_value) : 0,
      valuation_rate: last ? Number(last.valuation_rate) : 0,
      last_inventory_ledger_entry_id: last ? last.id : null,
    };
    await this.inventoryRepository.upsertStockBalance(rebuilt);
    return rebuilt;
  }

  #assertCommon(input) {
    assertRequired(input.companyId, 'companyId');
    assertRequired(input.itemId, 'itemId');
    assertRequired(input.warehouseId, 'warehouseId');
    assertRequired(input.postingDate, 'postingDate');
    assertRequired(input.sourceDocumentType, 'sourceDocumentType');
    assertRequired(input.sourceDocumentId, 'sourceDocumentId');
  }

  async #assertNoExistingStock(input, tx) {
    const existing = await this.inventoryRepository.listLedgerEntries({
      companyId: input.companyId,
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      tx,
    });
    if (existing.length > 0) {
      throw new InventoryError('OPENING_STOCK_ALREADY_EXISTS', 'Opening Stock cannot be posted after existing inventory entries');
    }
  }

  async #assertNoLaterEntry(entry, tx) {
    const hasLater = await this.inventoryRepository.hasLaterLedgerEntry({
      companyId: entry.company_id,
      itemId: entry.item_id,
      warehouseId: entry.warehouse_id,
      postingDate: entry.posting_date,
      postingTime: entry.posting_time,
      tx,
    });
    if (hasLater) {
      throw new InventoryError('BACKDATED_INVENTORY_BLOCKED', 'Backdated inventory post/cancel is blocked because a later entry exists', {
        companyId: entry.company_id,
        itemId: entry.item_id,
        warehouseId: entry.warehouse_id,
        postingDate: entry.posting_date,
        postingTime: entry.posting_time,
      });
    }
  }

  async #postMovement(input, tx) {
    const balance = await this.inventoryRepository.getStockBalance({
      companyId: input.companyId,
      itemId: input.itemId,
      warehouseId: input.warehouseId,
      tx,
    });
    const quantityChange = roundQty(input.quantityChange);
    const currentQty = Number(balance.actual_qty || 0);
    const currentValue = Number(balance.stock_value || 0);
    const currentRate = currentQty === 0 ? 0 : roundRate(Number(balance.valuation_rate || currentValue / currentQty));
    const qtyAfter = roundQty(currentQty + quantityChange);

    if (qtyAfter < 0) {
      throw new InventoryError('NEGATIVE_STOCK_BLOCKED', 'Negative stock is blocked by default', {
        currentQty,
        quantityChange,
        qtyAfter,
      });
    }

    let stockValueDifference;
    if (quantityChange > 0) {
      const inboundRate = Number(input.valuationRateInput);
      if (!Number.isFinite(inboundRate) || inboundRate < 0) {
        throw new InventoryError('VALUATION_RATE_REQUIRED', 'Inbound inventory movement requires valuationRate');
      }
      stockValueDifference = roundMoney(quantityChange * inboundRate);
    } else {
      stockValueDifference = roundMoney(quantityChange * currentRate);
    }

    const stockValue = roundMoney(max(currentValue + stockValueDifference, 0));
    const valuationRate = qtyAfter === 0 ? 0 : roundRate(stockValue / qtyAfter);
    const entry = {
      id: input.inventoryLedgerEntryId || makeUuid(),
      company_id: input.companyId,
      item_id: input.itemId,
      warehouse_id: input.warehouseId,
      posting_date: input.postingDate,
      posting_time: normalizePostingTime(input.postingTime),
      source_document_type: input.sourceDocumentType,
      source_document_id: input.sourceDocumentId,
      source_document_line_id: input.sourceDocumentLineId || null,
      movement_type: input.movementType,
      quantity_change: quantityChange,
      qty_after_transaction: qtyAfter,
      valuation_rate: valuationRate,
      stock_value: stockValue,
      stock_value_difference: stockValueDifference,
      transfer_group_id: input.transferGroupId || null,
      transfer_pair_id: input.transferPairId || null,
      is_reversal: Boolean(input.isReversal),
      reverses_inventory_ledger_entry_id: input.reversesInventoryLedgerEntryId || null,
    };

    await this.#assertNoLaterEntry(entry, tx);
    await this.#insertLedgerAndBalance(entry, tx);

    let accountingResult = null;
    if (input.glRequired && stockValueDifference !== 0) {
      accountingResult = await this.#postInventoryGl(input, entry, tx);
    }

    return { entry, accountingResult };
  }

  async #insertLedgerAndBalance(entry, tx) {
    await this.inventoryRepository.insertLedgerEntry(entry, tx);
    await this.inventoryRepository.upsertStockBalance({
      company_id: entry.company_id,
      item_id: entry.item_id,
      warehouse_id: entry.warehouse_id,
      actual_qty: entry.qty_after_transaction,
      stock_value: entry.stock_value,
      valuation_rate: entry.valuation_rate,
      last_inventory_ledger_entry_id: entry.id,
    }, tx);
  }

  async #postInventoryGl(input, entry, tx) {
    assertRequired(input.inventoryAccountId, 'inventoryAccountId');
    assertRequired(input.offsetAccountId, 'offsetAccountId');
    const diff = roundMoney(entry.stock_value_difference);
    const absAmount = toMinorUnits(Math.abs(diff));
    const inventoryDebitAmount = diff > 0 ? absAmount : 0;
    const inventoryCreditAmount = diff < 0 ? absAmount : 0;
    const offsetDebitAmount = diff < 0 ? absAmount : 0;
    const offsetCreditAmount = diff > 0 ? absAmount : 0;

    const request = {
      company_id: entry.company_id,
      posting_date: entry.posting_date,
      source_document_type: entry.source_document_type,
      source_document_id: entry.source_document_id,
      idempotency_key: `inventory:${entry.id}:gl`,
      lines: [
        {
          account_id: input.inventoryAccountId,
          debit_amount: inventoryDebitAmount,
          credit_amount: inventoryCreditAmount,
          inventory_item_id: entry.item_id,
          warehouse_id: entry.warehouse_id,
          inventory_ledger_entry_id: entry.id,
        },
        {
          account_id: input.offsetAccountId,
          debit_amount: offsetDebitAmount,
          credit_amount: offsetCreditAmount,
          inventory_item_id: entry.item_id,
          warehouse_id: entry.warehouse_id,
          inventory_ledger_entry_id: entry.id,
        },
      ],
    };

    return this.accountingEngine.postAccountingDocument(request, tx);
  }
}

module.exports = {
  InventoryService,
  InventoryError,
  comparePostingTimestamp,
  roundMoney,
  roundQty,
  roundRate,
  toMinorUnits,
};
