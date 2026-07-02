'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const serviceSource = fs.readFileSync(path.join(__dirname, '..', 'src/modules/inventory/services/InventoryService.js'), 'utf8');
const glComposerSource = serviceSource.slice(serviceSource.indexOf('const request = {'), serviceSource.indexOf('return this.accountingEngine.postAccountingDocument'));

test('InventoryService calls EW-01 postAccountingDocument(request, tx), not legacy accountingEngine.post()', () => {
  assert.match(serviceSource, /postAccountingDocument\(request, tx\)/);
  assert.doesNotMatch(serviceSource, /accountingEngine\.post\s*\(/);
});

test('InventoryService composes EW-01 snake_case GL payload fields only', () => {
  for (const token of [
    'company_id',
    'posting_date',
    'source_document_type',
    'source_document_id',
    'idempotency_key',
    'account_id',
    'debit_amount',
    'credit_amount',
    'inventory_item_id',
    'warehouse_id',
    'inventory_ledger_entry_id',
  ]) {
    assert.match(glComposerSource, new RegExp(token));
  }
  for (const legacyToken of [
    /accountId:/,
    /debit:/,
    /credit:/,
    /inventoryLedgerEntryId:/,
    /companyId:\s*entry\.company_id/,
    /idempotencyKey:/,
  ]) {
    assert.doesNotMatch(glComposerSource, legacyToken);
  }
});
