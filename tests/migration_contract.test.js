'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_inventory_mergeable_v1_1.sql'), 'utf8');
const executableSql = migration
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n');

test('migration declares required inventory tables and canonical fields', () => {
  for (const token of [
    'CREATE TABLE IF NOT EXISTS inventory_ledger_entries',
    'CREATE TABLE IF NOT EXISTS stock_balances',
    'CREATE TABLE IF NOT EXISTS opening_stock_documents',
    'CREATE TABLE IF NOT EXISTS inventory_adjustments',
    'company_id',
    'item_id',
    'warehouse_id',
    'posting_date',
    'posting_time',
    'source_document_type',
    'source_document_id',
    'source_document_line_id',
    'movement_type',
    'quantity_change',
    'qty_after_transaction',
    'valuation_rate',
    'stock_value',
    'stock_value_difference',
    'transfer_group_id',
    'transfer_pair_id',
    'is_reversal',
    'reverses_inventory_ledger_entry_id',
    'last_inventory_ledger_entry_id',
  ]) {
    assert.match(migration, new RegExp(token.replace(/[()]/g, '\\$&')));
  }
});

test('inventory ids and foreign keys are UUID-compatible with EW-01 and MD-01', () => {
  assert.match(migration, /inventory_ledger_entries\s*\([\s\S]*id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
  assert.match(migration, /company_id UUID NOT NULL REFERENCES companies\(id\)/i);
  assert.match(migration, /item_id UUID NOT NULL REFERENCES items\(id\)/i);
  assert.match(migration, /warehouse_id UUID NOT NULL REFERENCES warehouses\(id\)/i);
  assert.match(migration, /source_document_id UUID NOT NULL/i);
  assert.match(migration, /source_document_line_id UUID/i);
  assert.match(migration, /transfer_group_id UUID/i);
  assert.match(migration, /transfer_pair_id UUID REFERENCES inventory_ledger_entries\(id\)/i);
  assert.match(migration, /reverses_inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries\(id\)/i);
  assert.match(migration, /last_inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries\(id\)/i);
  assert.doesNotMatch(migration, /id TEXT PRIMARY KEY/i);
  assert.doesNotMatch(migration, /last_inventory_ledger_entry_id TEXT/i);
});

test('opening stock and adjustment documents use UUID-compatible ids and account references', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS opening_stock_documents\s*\([\s\S]*id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
  assert.match(migration, /opening_stock_offset_account_id UUID NOT NULL REFERENCES accounts\(id\)/i);
  assert.match(migration, /inventory_account_id UUID NOT NULL REFERENCES accounts\(id\)/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS inventory_adjustments\s*\([\s\S]*id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
  assert.match(migration, /offset_account_id UUID NOT NULL REFERENCES accounts\(id\)/i);
  assert.match(migration, /inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries\(id\)/i);
});

test('migration includes append-only trigger and negative/backdated insert guard', () => {
  assert.match(migration, /reject_inventory_ledger_mutation/);
  assert.match(migration, /BEFORE UPDATE ON inventory_ledger_entries/);
  assert.match(migration, /BEFORE DELETE ON inventory_ledger_entries/);
  assert.match(migration, /validate_inventory_ledger_insert/);
  assert.match(migration, /qty_after_transaction < 0/);
  assert.match(migration, /backdated inventory post\/cancel is blocked/i);
});

test('migration aligns EW-01 GL linkage as UUID and does not duplicate GL tables', () => {
  assert.match(migration, /ALTER TABLE gl_entries\s+ADD COLUMN IF NOT EXISTS inventory_ledger_entry_id UUID/i);
  assert.match(migration, /gl_entries\.inventory_ledger_entry_id must be UUID/i);
  assert.match(migration, /fk_gl_entries_inventory_ledger_entry_id/i);
  assert.doesNotMatch(migration, /inventory_ledger_entry_id TEXT/i);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS gl_entries/i);
  assert.doesNotMatch(migration, /CREATE TABLE\s+gl_entries/i);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS journal_entries/i);
  assert.doesNotMatch(migration, /CREATE TABLE\s+journal_entries/i);
});

test('migration excludes forbidden P1/P2/future inventory features', () => {
  const forbidden = [
    /fifo/i,
    /landed_cost/i,
    /serial/i,
    /batch/i,
    /manufacturing/i,
    /repost/i,
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSql, pattern);
  }
});
