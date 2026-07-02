'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { InventoryService, InventoryError, toMinorUnits } = require('../src/modules/inventory/services/InventoryService');
const { InMemoryInventoryRepository } = require('../src/modules/inventory/repositories/InMemoryInventoryRepository');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function uuid(n) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

class FakeAccountingEngine {
  constructor() {
    this.posts = [];
  }

  async postAccountingDocument(request, tx) {
    this.posts.push({ request: JSON.parse(JSON.stringify(request)), tx });
    return {
      journal_entry_id: uuid(9000 + this.posts.length),
      gl_entry_ids: request.lines.map((_, index) => uuid(9100 + index + (this.posts.length * 10))),
    };
  }
}

function makeHarness() {
  const repo = new InMemoryInventoryRepository();
  const accounting = new FakeAccountingEngine();
  const service = new InventoryService({
    inventoryRepository: repo,
    accountingEngine: accounting,
    transactionManager: repo,
  });
  return { service, repo, accounting };
}

function base(overrides = {}) {
  return {
    companyId: uuid(1),
    itemId: uuid(2),
    warehouseId: uuid(3),
    postingDate: '2026-01-01',
    postingTime: '09:00:00',
    sourceDocumentType: 'unit_test_doc',
    sourceDocumentId: uuid(4),
    sourceDocumentLineId: uuid(5),
    inventoryAccountId: uuid(6),
    offsetAccountId: uuid(7),
    ...overrides,
  };
}

function assertCanonicalAccountingPayload(post, entry) {
  const request = post.request;
  assert.equal(request.company_id, entry.company_id);
  assert.equal(request.posting_date, entry.posting_date);
  assert.equal(request.source_document_type, entry.source_document_type);
  assert.equal(request.source_document_id, entry.source_document_id);
  assert.match(request.idempotency_key, new RegExp(entry.id));
  assert.ok(post.tx, 'tx is passed as the second postAccountingDocument argument');

  for (const forbidden of ['companyId', 'sourceDocumentType', 'sourceDocumentId', 'postingDate', 'idempotencyKey', 'trx']) {
    assert.equal(Object.hasOwn(request, forbidden), false, `request must not expose ${forbidden}`);
  }

  for (const line of request.lines) {
    for (const key of ['account_id', 'debit_amount', 'credit_amount', 'inventory_item_id', 'warehouse_id', 'inventory_ledger_entry_id']) {
      assert.equal(Object.hasOwn(line, key), true, `line must expose ${key}`);
    }
    for (const forbidden of ['accountId', 'debit', 'credit', 'inventoryLedgerEntryId', 'metadata']) {
      assert.equal(Object.hasOwn(line, forbidden), false, `line must not expose ${forbidden}`);
    }
    assert.equal(line.inventory_ledger_entry_id, entry.id);
    assert.equal(line.inventory_item_id, entry.item_id);
    assert.equal(line.warehouse_id, entry.warehouse_id);
    assert.equal(Number.isInteger(line.debit_amount), true);
    assert.equal(Number.isInteger(line.credit_amount), true);
  }
}

test('service requires EW-01 postAccountingDocument(request, tx) contract', () => {
  assert.throws(
    () => new InventoryService({ inventoryRepository: new InMemoryInventoryRepository(), accountingEngine: { post: async () => undefined } }),
    (error) => error instanceof InventoryError && error.code === 'ACCOUNTING_ENGINE_CONTRACT_MISMATCH'
  );
});

test('generated inventory ledger and transfer ids are plain UUID-compatible values', async () => {
  const { service } = makeHarness();
  const receipt = await service.postReceipt(base({ quantity: 1, valuationRate: 100 }));
  assert.match(receipt.entry.id, UUID_RE);
  assert.doesNotMatch(receipt.entry.id, /^ile_/);

  await service.postOpeningStock(base({
    companyId: uuid(10),
    itemId: uuid(11),
    warehouseId: uuid(12),
    sourceDocumentId: uuid(13),
    sourceDocumentLineId: uuid(14),
    quantity: 10,
    valuationRate: 100,
    openingStockOffsetAccountId: uuid(15),
    inventoryAccountId: uuid(16),
    isSetupPeriod: true,
  }));
  const transfer = await service.postWarehouseTransfer({
    companyId: uuid(10),
    itemId: uuid(11),
    fromWarehouseId: uuid(12),
    toWarehouseId: uuid(17),
    postingDate: '2026-01-02',
    postingTime: '10:00:00',
    sourceDocumentType: 'warehouse_transfer',
    sourceDocumentId: uuid(18),
    sourceDocumentLineId: uuid(19),
    quantity: 5,
  });
  assert.match(transfer.transferGroupId, UUID_RE);
  assert.doesNotMatch(transfer.transferGroupId, /^itxgrp_/);
  assert.match(transfer.sourceEntry.id, UUID_RE);
  assert.match(transfer.targetEntry.id, UUID_RE);
});

test('stock_balances update after receipt and issue', async () => {
  const { service, repo } = makeHarness();
  const receipt = await service.postReceipt(base({ quantity: 10, valuationRate: 100 }));
  assert.equal(receipt.entry.quantity_change, 10);
  assert.equal(receipt.entry.qty_after_transaction, 10);
  assert.equal(receipt.entry.stock_value, 1000);

  const issue = await service.postIssue(base({ sourceDocumentId: uuid(20), quantity: 4, postingDate: '2026-01-02' }));
  assert.equal(issue.entry.quantity_change, -4);
  assert.equal(issue.entry.stock_value_difference, -400);

  const balance = await repo.getStockBalance({ companyId: uuid(1), itemId: uuid(2), warehouseId: uuid(3) });
  assert.equal(balance.actual_qty, 6);
  assert.equal(balance.stock_value, 600);
  assert.equal(balance.valuation_rate, 100);
  assert.equal(balance.last_inventory_ledger_entry_id, issue.entry.id);
});

test('Moving Average valuation computes stock_value_difference and updated valuation rate', async () => {
  const { service } = makeHarness();
  await service.postReceipt(base({ quantity: 10, valuationRate: 100 }));
  await service.postIssue(base({ sourceDocumentId: uuid(21), quantity: 4, postingDate: '2026-01-02' }));
  const receipt2 = await service.postReceipt(base({ sourceDocumentId: uuid(22), quantity: 6, valuationRate: 200, postingDate: '2026-01-03' }));

  assert.equal(receipt2.entry.stock_value_difference, 1200);
  assert.equal(receipt2.entry.qty_after_transaction, 12);
  assert.equal(receipt2.entry.stock_value, 1800);
  assert.equal(receipt2.entry.valuation_rate, 150);
});

test('negative stock issue is rejected by default', async () => {
  const { service } = makeHarness();
  await assert.rejects(
    service.postIssue(base({ quantity: 1 })),
    (error) => error instanceof InventoryError && error.code === 'NEGATIVE_STOCK_BLOCKED'
  );
});

test('backdated entry is rejected when later entry exists for same company item warehouse', async () => {
  const { service } = makeHarness();
  await service.postReceipt(base({ quantity: 10, valuationRate: 100, postingDate: '2026-01-02' }));

  await assert.rejects(
    service.postReceipt(base({ sourceDocumentId: uuid(23), quantity: 1, valuationRate: 100, postingDate: '2026-01-01' })),
    (error) => error instanceof InventoryError && error.code === 'BACKDATED_INVENTORY_BLOCKED'
  );
});

test('Opening Stock requires opening_stock_offset_account_id and opening period', async () => {
  const { service } = makeHarness();
  await assert.rejects(
    service.postOpeningStock(base({ quantity: 10, valuationRate: 100, isSetupPeriod: true, openingStockOffsetAccountId: undefined })),
    (error) => error instanceof InventoryError && error.code === 'VALIDATION_ERROR'
  );

  await assert.rejects(
    service.postOpeningStock(base({ quantity: 10, valuationRate: 100, openingStockOffsetAccountId: uuid(30), isSetupPeriod: false })),
    (error) => error instanceof InventoryError && error.code === 'OPENING_PERIOD_REQUIRED'
  );

  const posted = await service.postOpeningStock(base({ quantity: 10, valuationRate: 100, openingStockOffsetAccountId: uuid(30), isSetupPeriod: true }));
  assert.equal(posted.entry.movement_type, 'opening_stock');
  assert.equal(posted.entry.stock_value_difference, 1000);
});

test('Inventory Adjustment requires reason and offset_account_id', async () => {
  const { service } = makeHarness();
  await assert.rejects(
    service.postInventoryAdjustment(base({ quantityChange: 1, valuationRate: 100, adjustmentReason: 'count correction', offsetAccountId: undefined })),
    (error) => error instanceof InventoryError && error.code === 'VALIDATION_ERROR'
  );

  await assert.rejects(
    service.postInventoryAdjustment(base({ quantityChange: 1, valuationRate: 100, adjustmentReason: '   ' })),
    (error) => error instanceof InventoryError && error.code === 'ADJUSTMENT_REASON_REQUIRED'
  );

  const adjustment = await service.postInventoryAdjustment(base({ quantityChange: 2, valuationRate: 50, adjustmentReason: 'physical count correction' }));
  assert.equal(adjustment.entry.movement_type, 'inventory_adjustment');
  assert.equal(adjustment.entry.stock_value_difference, 100);
});

test('Inventory GL lines use snake_case EW-01 payload and integer minor units', async () => {
  const { service, accounting } = makeHarness();
  const receipt = await service.postReceipt(base({ quantity: 5, valuationRate: 123 }));

  assert.equal(accounting.posts.length, 1);
  const post = accounting.posts[0];
  assertCanonicalAccountingPayload(post, receipt.entry);
  assert.equal(post.request.lines.length, 2);
  assert.equal(post.request.lines[0].account_id, uuid(6));
  assert.equal(post.request.lines[0].debit_amount, toMinorUnits(receipt.entry.stock_value_difference));
  assert.equal(post.request.lines[0].credit_amount, 0);
  assert.equal(post.request.lines[1].account_id, uuid(7));
  assert.equal(post.request.lines[1].debit_amount, 0);
  assert.equal(post.request.lines[1].credit_amount, toMinorUnits(receipt.entry.stock_value_difference));
});

test('Outbound GL lines credit inventory and debit offset using integer minor units', async () => {
  const { service, accounting } = makeHarness();
  await service.postReceipt(base({ quantity: 5, valuationRate: 123 }));
  const issue = await service.postIssue(base({ sourceDocumentId: uuid(24), quantity: 2, postingDate: '2026-01-02' }));
  const post = accounting.posts.at(-1);

  assertCanonicalAccountingPayload(post, issue.entry);
  assert.equal(post.request.lines[0].debit_amount, 0);
  assert.equal(post.request.lines[0].credit_amount, 246);
  assert.equal(post.request.lines[1].debit_amount, 246);
  assert.equal(post.request.lines[1].credit_amount, 0);
});

test('Transfer creates paired source and target entries using transfer_group_id and transfer_pair_id', async () => {
  const { service, accounting } = makeHarness();
  await service.postOpeningStock(base({ quantity: 10, valuationRate: 100, openingStockOffsetAccountId: uuid(30), isSetupPeriod: true }));

  const transfer = await service.postWarehouseTransfer({
    companyId: uuid(1),
    itemId: uuid(2),
    fromWarehouseId: uuid(3),
    toWarehouseId: uuid(31),
    postingDate: '2026-01-02',
    postingTime: '10:00:00',
    sourceDocumentType: 'warehouse_transfer',
    sourceDocumentId: uuid(32),
    sourceDocumentLineId: uuid(33),
    quantity: 5,
  });

  assert.equal(transfer.sourceEntry.movement_type, 'transfer_out');
  assert.equal(transfer.targetEntry.movement_type, 'transfer_in');
  assert.equal(transfer.sourceEntry.transfer_group_id, transfer.transferGroupId);
  assert.equal(transfer.targetEntry.transfer_group_id, transfer.transferGroupId);
  assert.equal(transfer.sourceEntry.transfer_pair_id, transfer.targetEntry.id);
  assert.equal(transfer.targetEntry.transfer_pair_id, transfer.sourceEntry.id);
  assert.equal(transfer.sourceEntry.stock_value_difference, -500);
  assert.equal(transfer.targetEntry.stock_value_difference, 500);
  assert.equal(accounting.posts.length, 1, 'transfer does not create company-level GL impact; only opening stock did');
});

test('inventory_ledger_entries append-only repository rejects UPDATE and DELETE paths', async () => {
  const { service, repo } = makeHarness();
  const receipt = await service.postReceipt(base({ quantity: 1, valuationRate: 100 }));

  await assert.rejects(repo.updateLedgerEntry(receipt.entry.id, { quantity_change: 2 }), /append-only/);
  await assert.rejects(repo.deleteLedgerEntry(receipt.entry.id), /append-only/);
});

test('cancel uses reversal entry and backdated cancel guard', async () => {
  const { service } = makeHarness();
  const receipt = await service.postReceipt(base({ quantity: 10, valuationRate: 100, postingDate: '2026-01-01' }));
  await service.postReceipt(base({ sourceDocumentId: uuid(34), quantity: 1, valuationRate: 100, postingDate: '2026-01-03' }));

  await assert.rejects(
    service.cancelInventoryEntry({
      inventoryLedgerEntryId: receipt.entry.id,
      companyId: uuid(1),
      postingDate: '2026-01-02',
      sourceDocumentType: 'cancel_inventory',
      sourceDocumentId: uuid(35),
      reason: 'operator requested cancel',
      inventoryAccountId: uuid(6),
      offsetAccountId: uuid(7),
    }),
    (error) => error instanceof InventoryError && error.code === 'BACKDATED_INVENTORY_BLOCKED'
  );
});
