const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createTaxLedgerService,
  REQUIRED_WRITER_FIELDS,
} = require('../src/taxLedgerService');
const { createFakeTaxLedgerRepository } = require('./fakeRepository');

function makeWriterInput(overrides = {}) {
  return {
    company_id: '11111111-1111-1111-1111-111111111111',
    source_document_type: 'sales_invoice',
    source_document_id: '22222222-2222-2222-2222-222222222222',
    source_document_line_id: '33333333-3333-3333-3333-333333333333',
    posting_date: '2026-06-01',
    invoice_no: 'SI-0001',
    invoice_date: '2026-06-01',
    party_type: 'customer',
    party_id: '44444444-4444-4444-4444-444444444444',
    tax_direction: 'output',
    tax_rate: 10,
    taxable_amount: 1000000,
    tax_amount: 100000,
    tax_account_id: '55555555-5555-5555-5555-555555555555',
    journal_entry_id: '66666666-6666-6666-6666-666666666666',
    tax_category: 'standard',
    currency: 'VND',
    ...overrides,
  };
}

function makeSalesLine(overrides = {}) {
  return {
    lineId: '33333333-3333-3333-3333-333333333333',
    taxAccountId: '55555555-5555-5555-5555-555555555555',
    partyType: 'customer',
    partyId: '44444444-4444-4444-4444-444444444444',
    taxableAmount: 1000000,
    taxAmount: 100000,
    taxRate: 10,
    taxCategory: 'standard',
    currency: 'VND',
    ...overrides,
  };
}

function makePurchaseLine(overrides = {}) {
  return {
    lineId: '33333333-3333-3333-3333-333333333334',
    taxAccountId: '55555555-5555-5555-5555-555555555556',
    partyType: 'supplier',
    partyId: '44444444-4444-4444-4444-444444444445',
    taxableAmount: 500000,
    taxAmount: 40000,
    taxRate: 8,
    taxCategory: 'standard',
    currency: 'VND',
    ...overrides,
  };
}

test('Writer contract accepts all senior-required fields and links journal_entry_id', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  const result = await service.writeTaxLedgerEntry(makeWriterInput());

  assert.equal(result.inserted, true);
  assert.equal(repo.rows.length, 1);
  assert.equal(repo.rows[0].journal_entry_id, '66666666-6666-6666-6666-666666666666');
  assert.equal(repo.rows[0].tax_account_id, '55555555-5555-5555-5555-555555555555');
  assert.equal(repo.rows[0].invoice_no, 'SI-0001');
  assert.equal(repo.rows[0].invoice_date, '2026-06-01');

  for (const field of REQUIRED_WRITER_FIELDS) {
    assert.ok(Object.prototype.hasOwnProperty.call(makeWriterInput(), field));
  }
});

test('Writer rejects missing journal_entry_id because tax ledger must link EW-01 posting result', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  await assert.rejects(
    () => service.writeTaxLedgerEntry(makeWriterInput({ journal_entry_id: undefined })),
    /journal_entry_id is required/
  );
});

test('Writer rejects missing tax_account_id and does not map VAT account itself', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  await assert.rejects(
    () => service.writeTaxLedgerEntry(makeWriterInput({ tax_account_id: undefined })),
    /tax_account_id is required/
  );
});

test('VAT output: Sales Invoice creates output tax ledger entries linked to EW-01 journal', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  const { created } = await service.recordVatOutput({
    companyId: '11111111-1111-1111-1111-111111111111',
    postingDate: '2026-06-01',
    invoiceNo: 'SI-0001',
    invoiceDate: '2026-06-01',
    sourceDocumentId: '22222222-2222-2222-2222-222222222222',
    journalEntryId: '66666666-6666-6666-6666-666666666666',
    lines: [makeSalesLine()],
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].row.tax_direction, 'output');
  assert.equal(created[0].row.tax_rate, 10);
  assert.equal(created[0].row.source_document_line_id, '33333333-3333-3333-3333-333333333333');
  assert.equal(created[0].row.journal_entry_id, '66666666-6666-6666-6666-666666666666');
});

test('VAT input: Purchase Invoice creates input tax ledger entries linked to EW-01 journal', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  const { created } = await service.recordVatInput({
    companyId: '11111111-1111-1111-1111-111111111111',
    postingDate: '2026-06-02',
    invoiceNo: 'PI-0001',
    invoiceDate: '2026-06-02',
    sourceDocumentId: '22222222-2222-2222-2222-222222222223',
    journalEntryId: '66666666-6666-6666-6666-666666666667',
    lines: [makePurchaseLine()],
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].row.tax_direction, 'input');
  assert.equal(created[0].row.tax_rate, 8);
  assert.equal(created[0].row.journal_entry_id, '66666666-6666-6666-6666-666666666667');
});

test('VAT input is posted only when tax metadata exists', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  const { created, skipped } = await service.recordVatInput({
    companyId: '11111111-1111-1111-1111-111111111111',
    postingDate: '2026-06-02',
    invoiceNo: 'PI-0002',
    invoiceDate: '2026-06-02',
    sourceDocumentId: '22222222-2222-2222-2222-222222222224',
    journalEntryId: '66666666-6666-6666-6666-666666666668',
    lines: [makePurchaseLine({ taxRate: null, taxAmount: null })],
  });

  assert.equal(created.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, 'no_tax_metadata');
});

test('Non-taxable invoice line does not create a VAT tax entry', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  const { created, skipped } = await service.recordVatOutput({
    companyId: '11111111-1111-1111-1111-111111111111',
    postingDate: '2026-06-01',
    invoiceNo: 'SI-0003',
    invoiceDate: '2026-06-01',
    sourceDocumentId: '22222222-2222-2222-2222-222222222225',
    journalEntryId: '66666666-6666-6666-6666-666666666669',
    lines: [makeSalesLine({ taxAmount: 0, taxRate: 0 })],
  });

  assert.equal(created.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].reason, 'non_taxable');
});

test('Idempotent retry: posting the same invoice twice does not duplicate entries', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  const input = makeWriterInput();
  const first = await service.writeTaxLedgerEntry(input);
  const second = await service.writeTaxLedgerEntry(input);

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.equal(repo.rows.length, 1);
});

test('Cancellation reversal creates reversal entries linked to reversal journal_entry_id', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  await service.writeTaxLedgerEntry(makeWriterInput({
    source_document_id: '22222222-2222-2222-2222-222222222226',
    source_document_line_id: '33333333-3333-3333-3333-333333333336',
    journal_entry_id: '66666666-6666-6666-6666-666666666670',
  }));

  const { reversals } = await service.reverseForSourceDocument({
    companyId: '11111111-1111-1111-1111-111111111111',
    sourceDocumentType: 'sales_invoice',
    sourceDocumentId: '22222222-2222-2222-2222-222222222226',
    postingDate: '2026-06-15',
    journalEntryId: '77777777-7777-7777-7777-777777777777',
  });

  assert.equal(reversals.length, 1);
  assert.equal(reversals[0].row.is_reversal, true);
  assert.equal(reversals[0].row.taxable_amount, -1000000);
  assert.equal(reversals[0].row.tax_amount, -100000);
  assert.equal(reversals[0].row.reversal_of_entry_id, reversals[0].originalEntryId);
  assert.equal(reversals[0].row.journal_entry_id, '77777777-7777-7777-7777-777777777777');

  const original = repo.rows.find((r) => r.id === reversals[0].originalEntryId);
  assert.equal(original.journal_entry_id, '66666666-6666-6666-6666-666666666670');
  assert.equal(original.is_reversal, false);
});

test('Cancellation reversal is idempotent on retry', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  await service.writeTaxLedgerEntry(makeWriterInput({
    source_document_id: '22222222-2222-2222-2222-222222222227',
    source_document_line_id: '33333333-3333-3333-3333-333333333337',
  }));

  const reversalInput = {
    companyId: '11111111-1111-1111-1111-111111111111',
    sourceDocumentType: 'sales_invoice',
    sourceDocumentId: '22222222-2222-2222-2222-222222222227',
    postingDate: '2026-06-15',
    journalEntryId: '77777777-7777-7777-7777-777777777778',
  };
  await service.reverseForSourceDocument(reversalInput);
  await service.reverseForSourceDocument(reversalInput);

  const reversalRows = repo.rows.filter((r) => r.is_reversal);
  assert.equal(reversalRows.length, 1);
});

test('Company isolation and taxDirection filter', async () => {
  const repo = createFakeTaxLedgerRepository();
  const service = createTaxLedgerService(repo);

  await service.writeTaxLedgerEntry(makeWriterInput({ company_id: 'co-A', source_document_id: 'doc-A', source_document_line_id: 'line-A' }));
  await service.writeTaxLedgerEntry(makeWriterInput({
    company_id: 'co-B',
    source_document_id: 'doc-B',
    source_document_line_id: 'line-B',
    party_id: 'party-B',
    journal_entry_id: 'je-B',
  }));
  await service.writeTaxLedgerEntry(makeWriterInput({
    company_id: 'co-A',
    source_document_type: 'purchase_invoice',
    source_document_id: 'doc-A2',
    source_document_line_id: 'line-A2',
    tax_direction: 'input',
    party_type: 'supplier',
    party_id: 'supplier-A',
    tax_account_id: 'tax-input-A',
    journal_entry_id: 'je-A2',
  }));

  const resultsA = await service.queryEntries({ companyId: 'co-A' });
  const inputOnly = await service.queryEntries({ companyId: 'co-A', taxDirection: 'input' });

  assert.equal(resultsA.length, 2);
  assert.equal(inputOnly.length, 1);
  assert.equal(inputOnly[0].tax_direction, 'input');
  await assert.rejects(() => service.queryEntries({}), /companyId is required/);
});

test('Append-only enforcement: repositories expose no update/delete and SQL blocks mutation', async () => {
  const repo = createFakeTaxLedgerRepository();
  assert.equal(repo.update, undefined);
  assert.equal(repo.delete, undefined);

  const pgRepoModule = require('../src/taxLedgerRepository.pg');
  const fakeDb = { query: async () => ({ rows: [] }) };
  const pgRepo = pgRepoModule.createPgTaxLedgerRepository(fakeDb);
  assert.equal(pgRepo.update, undefined);
  assert.equal(pgRepo.delete, undefined);

  const sql = fs.readFileSync(path.join(__dirname, '../migrations/0001_create_tax_ledger_entries.sql'), 'utf8');
  assert.match(sql, /BEFORE UPDATE ON tax_ledger_entries/);
  assert.match(sql, /BEFORE DELETE ON tax_ledger_entries/);
});

test('EW-06 code has no direct GL insert/write responsibility', async () => {
  const files = [
    '../src/taxLedgerService.js',
    '../src/taxLedgerRepository.pg.js',
    '../src/taxLedgerRoutes.js',
  ];

  for (const rel of files) {
    const content = fs.readFileSync(path.join(__dirname, rel), 'utf8').toLowerCase();
    assert.equal(content.includes('insert into gl_entries'), false, `${rel} must not insert gl_entries`);
    assert.equal(content.includes('update gl_entries'), false, `${rel} must not update gl_entries`);
    assert.equal(content.includes('delete from gl_entries'), false, `${rel} must not delete gl_entries`);
  }
});
