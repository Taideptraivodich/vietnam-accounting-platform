'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const required = [
  'package.json',
  'README.md',
  'MIGRATION_ORDER.md',
  'DATABASE_CONTRACT_EW05_v1_1.md',
  'ACCOUNTING_ENGINE_INTEGRATION_EW05_v1_1.md',
  'INVENTORY_LEDGER_SCHEMA_PATCH.sql',
  'migrations/001_inventory_mergeable_v1_1.sql',
  'src/modules/inventory/services/InventoryService.js',
  'src/modules/inventory/repositories/InMemoryInventoryRepository.js',
  'src/modules/inventory/repositories/PostgresInventoryRepository.js',
  'tests/accounting_contract.test.js',
  'tests/inventory_service.test.js',
  'tests/migration_contract.test.js',
  'IMPLEMENTATION_SUMMARY.md',
  'OPEN_ISSUES.md',
  'TEST_EVIDENCE.md',
  'TEST_EVIDENCE_EW05_v1_1.md',
];

for (const relative of required) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing package file: ${relative}`);
  }
}

const migration = fs.readFileSync(path.join(root, 'migrations/001_inventory_mergeable_v1_1.sql'), 'utf8');
const rootPatch = fs.readFileSync(path.join(root, 'INVENTORY_LEDGER_SCHEMA_PATCH.sql'), 'utf8');
if (migration !== rootPatch) {
  throw new Error('Root INVENTORY_LEDGER_SCHEMA_PATCH.sql must match migrations/001_inventory_mergeable_v1_1.sql');
}

const forbiddenCreates = [
  /CREATE TABLE\s+(IF NOT EXISTS\s+)?companies/i,
  /CREATE TABLE\s+(IF NOT EXISTS\s+)?accounts/i,
  /CREATE TABLE\s+(IF NOT EXISTS\s+)?journal_entries/i,
  /CREATE TABLE\s+(IF NOT EXISTS\s+)?gl_entries/i,
];
for (const pattern of forbiddenCreates) {
  if (pattern.test(migration)) {
    throw new Error(`Forbidden duplicate shared schema detected: ${pattern}`);
  }
}

for (const requiredPattern of [
  /id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/i,
  /company_id UUID NOT NULL REFERENCES companies\(id\)/i,
  /item_id UUID NOT NULL REFERENCES items\(id\)/i,
  /warehouse_id UUID NOT NULL REFERENCES warehouses\(id\)/i,
  /ALTER TABLE gl_entries\s+ADD COLUMN IF NOT EXISTS inventory_ledger_entry_id UUID/i,
  /FOREIGN KEY \(inventory_ledger_entry_id\)\s+REFERENCES inventory_ledger_entries\(id\)/i,
]) {
  if (!requiredPattern.test(migration)) {
    throw new Error(`Missing required UUID/GL contract pattern: ${requiredPattern}`);
  }
}

for (const forbiddenPattern of [
  /inventory_ledger_entry_id TEXT/i,
  /id TEXT PRIMARY KEY/i,
  /ile_/, 
  /itxgrp_/, 
]) {
  if (forbiddenPattern.test(migration)) {
    throw new Error(`Forbidden legacy identifier pattern in migration: ${forbiddenPattern}`);
  }
}

const service = fs.readFileSync(path.join(root, 'src/modules/inventory/services/InventoryService.js'), 'utf8');
const glComposer = service.slice(service.indexOf('const request = {'), service.indexOf('return this.accountingEngine.postAccountingDocument'));
if (/accountingEngine\.post\s*\(/.test(service)) {
  throw new Error('Legacy accountingEngine.post() call detected');
}
if (!/postAccountingDocument\(request, tx\)/.test(service)) {
  throw new Error('Missing EW-01 postAccountingDocument(request, tx) call');
}
for (const token of ['company_id', 'account_id', 'debit_amount', 'credit_amount', 'inventory_ledger_entry_id']) {
  if (!glComposer.includes(token)) {
    throw new Error(`Missing canonical accounting payload token: ${token}`);
  }
}
for (const forbidden of [/accountId:/, /debit:/, /credit:/, /inventoryLedgerEntryId:/]) {
  if (forbidden.test(glComposer)) {
    throw new Error(`Legacy Accounting Engine payload field detected: ${forbidden}`);
  }
}

console.log('EW-05 v1.1 package verification PASS');
