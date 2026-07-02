'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const AccountRepository = require('../src/repositories/AccountRepository');
const FiscalPeriodRepository = require('../src/repositories/FiscalPeriodRepository');
const JournalEntryRepository = require('../src/repositories/JournalEntryRepository');
const GlEntryRepository = require('../src/repositories/GlEntryRepository');
const PostingValidator = require('../src/validators/PostingValidator');
const { PostingService, ValidationError } = require('../src/services/PostingService');
const { withTransaction } = require('../src/utils/UnitOfWork');
const { MockDb, seedCompany, seedAccount, seedAccountMapping, seedPeriod, randomUUID } = require('./helpers');

function buildService(db) {
  const accountRepo = new AccountRepository(db);
  const periodRepo = new FiscalPeriodRepository(db);
  const jeRepo = new JournalEntryRepository(db);
  const glRepo = new GlEntryRepository(db);
  const validator = new PostingValidator({ accountRepository: accountRepo, fiscalPeriodRepository: periodRepo });
  return new PostingService({ journalEntryRepository: jeRepo, glEntryRepository: glRepo, postingValidator: validator, db });
}

function baseFixture() {
  const db = new MockDb();
  const company = seedCompany(db);
  const cash = seedAccount(db, { company_id: company.id, code: '1111', name: 'Cash', account_subtype: 'cash' });
  const revenue = seedAccount(db, { company_id: company.id, code: '5111', name: 'Revenue', account_type: 'REVENUE', account_subtype: 'sales_revenue', normal_balance: 'CREDIT' });
  const svc = buildService(db);
  return { db, company, cash, revenue, svc };
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}

function postRequest(company, cash, revenue, override = {}) {
  const sourceDocumentId = override.source_document_id || randomUUID();
  return {
    company_id: company.id,
    posting_date: '2024-01-15',
    source_document_type: 'SALES_INVOICE',
    source_document_id: sourceDocumentId,
    source_document_no: 'SI-0001',
    idempotency_key: `SALES_INVOICE:${sourceDocumentId}:post:v1`,
    lines: [
      {
        account_id: cash.id,
        debit_amount: 1100000,
        source_document_line_id: randomUUID(),
        party_type: 'CUSTOMER',
        party_id: randomUUID(),
        tax_metadata: { tax_code: 'VAT10', tax_rate: 0.1 },
      },
      {
        account_id: revenue.id,
        credit_amount: 1100000,
        source_document_line_id: randomUUID(),
        tax_metadata: { tax_code: 'VAT10', taxable_amount: 1000000 },
      },
    ],
    ...override,
  };
}

(async () => {

  await run('accounts.account_subtype CHECK accepts only canonical goods_received_not_invoiced subtype', async () => {
    const migrationSql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_gl_foundation.sql'), 'utf8');
    const legacySubtype = ['g', 'r', 'n', 'i'].join('');
    assert.ok(migrationSql.includes("'goods_received_not_invoiced'"));
    assert.ok(!migrationSql.includes(`'${legacySubtype}'`));
    assert.ok(/ALTER TABLE accounts ADD CONSTRAINT accounts_valid_subtype CHECK/.test(migrationSql));
  });

  await run('postAccountingDocument requires caller transaction', async () => {
    const { company, cash, revenue, svc } = baseFixture();
    await assert.rejects(
      () => svc.postAccountingDocument(postRequest(company, cash, revenue)),
      /transaction client `tx` with query\(\) is required/i
    );
  });

  await run('postAccountingDocument posts through provided tx without BEGIN/COMMIT', async () => {
    const { db, company, cash, revenue, svc } = baseFixture();
    const tx = await db.connect();
    const result = await svc.postAccountingDocument(postRequest(company, cash, revenue), tx);

    assert.strictEqual(result.status, 'POSTED');
    assert.strictEqual(result.gl_entry_ids.length, 2);
    assert.strictEqual(db.tables.journal_entries.length, 1);
    assert.strictEqual(db.tables.gl_entries.length, 2);
    assert.deepStrictEqual(db.transactionLog, []);
    assert.strictEqual(db.tables.gl_entries[0].source_document_no, 'SI-0001');
    assert.deepStrictEqual(db.tables.gl_entries[0].tax_metadata, { tax_code: 'VAT10', tax_rate: 0.1 });
  });

  await run('UnitOfWork opens and commits once around source + GL work', async () => {
    const { db, company, cash, revenue, svc } = baseFixture();
    const result = await withTransaction(db, async tx => {
      // Simulate business module source/subledger write in same tx.
      await tx.query('SELECT * FROM accounts WHERE company_id = $1 AND id = $2 AND is_active = TRUE', [company.id, cash.id]);
      return svc.postAccountingDocument(postRequest(company, cash, revenue), tx);
    });
    assert.strictEqual(result.status, 'POSTED');
    assert.deepStrictEqual(db.transactionLog, ['BEGIN', 'COMMIT']);
  });

  await run('postAccountingDocument is idempotent by company-scoped idempotency_key', async () => {
    const { db, company, cash, revenue, svc } = baseFixture();
    const tx = await db.connect();
    const req = postRequest(company, cash, revenue);
    const first = await svc.postAccountingDocument(req, tx);
    const second = await svc.postAccountingDocument(req, tx);
    assert.strictEqual(first.gl_entry_ids.length, 2);
    assert.strictEqual(second.idempotent, true);
    assert.deepStrictEqual(second.gl_entry_ids.sort(), first.gl_entry_ids.sort());
    assert.strictEqual(db.tables.gl_entries.length, 2);
  });

  await run('validator rejects unbalanced lines', async () => {
    const { company, cash, revenue, svc, db } = baseFixture();
    const tx = await db.connect();
    const req = postRequest(company, cash, revenue, {
      lines: [
        { account_id: cash.id, debit_amount: 100 },
        { account_id: revenue.id, credit_amount: 50 },
      ],
    });
    await assert.rejects(() => svc.postAccountingDocument(req, tx), ValidationError);
  });

  await run('locked fiscal period blocks posting', async () => {
    const { db, company, cash, revenue, svc } = baseFixture();
    seedPeriod(db, { company_id: company.id, start_date: '2024-01-01', end_date: '2024-01-31', is_locked: true });
    const tx = await db.connect();
    await assert.rejects(
      () => svc.postAccountingDocument(postRequest(company, cash, revenue), tx),
      /locked fiscal period/
    );
  });

  await run('reverseAccountingDocument appends reversal JE and GL rows only', async () => {
    const { db, company, cash, revenue, svc } = baseFixture();
    const tx = await db.connect();
    const posted = await svc.postAccountingDocument(postRequest(company, cash, revenue), tx);
    const beforeGlCount = db.tables.gl_entries.length;

    const reversal = await svc.reverseAccountingDocument({
      company_id: company.id,
      journal_entry_id: posted.journal_entry_id,
      posting_date: '2024-01-31',
      description: 'Reverse SI-0001',
      idempotency_key: `reversal:${posted.journal_entry_id}:2024-01-31`,
    }, tx);

    assert.strictEqual(reversal.reversal, true);
    assert.strictEqual(reversal.reversal_of_journal_entry_id, posted.journal_entry_id);
    assert.strictEqual(reversal.gl_entry_ids.length, 2);
    assert.strictEqual(db.tables.gl_entries.length, beforeGlCount + 2);
    assert.strictEqual(db.tables.journal_entries.find(j => j.id === posted.journal_entry_id).status, 'CANCELLED');
  });

  await run('gl_entries update/delete is blocked by repository surface and DB guard evidence', async () => {
    const { db, company, cash, revenue, svc } = baseFixture();
    const tx = await db.connect();
    await svc.postAccountingDocument(postRequest(company, cash, revenue), tx);
    const glRepo = new GlEntryRepository(db);
    assert.strictEqual(glRepo.update, undefined);
    assert.strictEqual(glRepo.delete, undefined);
    await assert.rejects(() => db.query('UPDATE gl_entries SET debit_amount = $1 WHERE id = $2', [1, db.tables.gl_entries[0].id]), /append-only/);
    await assert.rejects(() => db.query('DELETE FROM gl_entries WHERE id = $1', [db.tables.gl_entries[0].id]), /append-only/);
  });


  await run('accounts contract exposes metadata without physical accounts.account_id', async () => {
    const { company, cash } = baseFixture();
    assert.strictEqual(cash.account_subtype, 'cash');
    assert.strictEqual(cash.normal_balance, 'DEBIT');
    assert.strictEqual(cash.requires_tax_info, false);
    assert.strictEqual(cash.requires_inventory_item, false);
    assert.strictEqual(cash.presentation_rule, 'STANDARD');
    assert.strictEqual(cash.phase_scope, 'BASELINE');
    assert.strictEqual(cash.accounting_regime, 'VAS');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(cash, 'account_id'), false);
    assert.ok(company.id);
  });

  await run('account resolver returns account_id payload alias equal to accounts.id', async () => {
    const db = new MockDb();
    const company = seedCompany(db);
    const accountRepo = new AccountRepository(db);
    const receivable = seedAccount(db, {
      company_id: company.id,
      code: '1311',
      name: 'Trade Receivable',
      account_type: 'ASSET',
      account_subtype: 'receivable',
      requires_party: true,
      default_party_type: 'CUSTOMER',
    });
    const resolved = await accountRepo.resolveAccountBySubtype(company.id, 'receivable', {});
    assert.strictEqual(resolved.id, receivable.id);
    assert.strictEqual(resolved.account_id, receivable.id);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(receivable, 'account_id'), false);
  });


  await run('resolveGRNIAccount resolves goods_received_not_invoiced and returns account_id alias', async () => {
    const db = new MockDb();
    const company = seedCompany(db);
    const supplierId = randomUUID();
    const itemId = randomUUID();
    const warehouseId = randomUUID();
    const accountRepo = new AccountRepository(db);
    const clearing = seedAccount(db, {
      company_id: company.id,
      code: '3318',
      name: 'Goods Received Not Invoiced',
      account_type: 'LIABILITY',
      account_subtype: 'goods_received_not_invoiced',
      normal_balance: 'CREDIT',
      requires_party: true,
      default_party_type: 'SUPPLIER',
      requires_inventory_item: true,
      requires_warehouse: true,
    });
    seedAccountMapping(db, {
      company_id: company.id,
      account_subtype: 'goods_received_not_invoiced',
      account_id: clearing.id,
      party_type: 'SUPPLIER',
      party_id: supplierId,
      item_id: itemId,
      warehouse_id: warehouseId,
      priority: 1,
      is_default: true,
    });

    const resolved = await accountRepo.resolveGRNIAccount(company.id, supplierId, itemId, warehouseId);
    assert.strictEqual(resolved.id, clearing.id);
    assert.strictEqual(resolved.account_id, clearing.id);
    assert.strictEqual(resolved.account_subtype, 'goods_received_not_invoiced');
  });

  await run('cash/bank resolver honors explicit account_id and mapping fallback', async () => {
    const db = new MockDb();
    const company = seedCompany(db);
    const accountRepo = new AccountRepository(db);
    const cash = seedAccount(db, { company_id: company.id, code: '1111', account_subtype: 'cash' });
    const bank = seedAccount(db, { company_id: company.id, code: '1121', name: 'Bank', account_subtype: 'bank' });
    seedAccountMapping(db, {
      company_id: company.id,
      account_subtype: 'bank',
      account_id: bank.id,
      payment_method: 'BANK_TRANSFER',
      priority: 1,
      is_default: true,
    });

    const explicitCash = await accountRepo.resolveCashOrBank(company.id, 'BANK_TRANSFER', cash.id);
    const mappedBank = await accountRepo.resolveCashOrBank(company.id, 'BANK_TRANSFER');
    assert.strictEqual(explicitCash.account_id, cash.id);
    assert.strictEqual(mappedBank.account_id, bank.id);
  });

  await run('validator enforces freeze account metadata dimensions', async () => {
    const db = new MockDb();
    const company = seedCompany(db);
    const inventory = seedAccount(db, {
      company_id: company.id,
      code: '1561',
      name: 'Merchandise Inventory',
      account_subtype: 'merchandise_inventory',
      requires_inventory_item: true,
      requires_warehouse: true,
    });
    const payable = seedAccount(db, {
      company_id: company.id,
      code: '3311',
      name: 'Supplier Payable',
      account_type: 'LIABILITY',
      account_subtype: 'payable',
      normal_balance: 'CREDIT',
      requires_party: true,
      default_party_type: 'SUPPLIER',
    });
    const svc = buildService(db);
    const tx = await db.connect();
    const req = {
      company_id: company.id,
      posting_date: '2024-01-15',
      source_document_type: 'PURCHASE_INVOICE',
      source_document_id: randomUUID(),
      idempotency_key: `PURCHASE_INVOICE:${randomUUID()}:post:v1`,
      lines: [
        { account_id: inventory.id, debit_amount: 1000, warehouse_id: randomUUID() },
        { account_id: payable.id, credit_amount: 1000, party_type: 'SUPPLIER', party_id: randomUUID() },
      ],
    };
    await assert.rejects(() => svc.postAccountingDocument(req, tx), /requires inventory_item_id/);

    req.lines[0].inventory_item_id = randomUUID();
    const posted = await svc.postAccountingDocument(req, tx);
    assert.strictEqual(posted.status, 'POSTED');
    assert.strictEqual(db.tables.gl_entries[0].inventory_item_id, req.lines[0].inventory_item_id);
  });

  await run('VAT metadata account requires tax_metadata', async () => {
    const db = new MockDb();
    const company = seedCompany(db);
    const vatOutput = seedAccount(db, {
      company_id: company.id,
      code: '33311',
      name: 'VAT Output',
      account_type: 'LIABILITY',
      account_subtype: 'vat_output',
      normal_balance: 'CREDIT',
      requires_tax_info: true,
    });
    const receivable = seedAccount(db, {
      company_id: company.id,
      code: '1311',
      name: 'Trade Receivable',
      account_subtype: 'receivable',
      requires_party: true,
      default_party_type: 'CUSTOMER',
    });
    const svc = buildService(db);
    const tx = await db.connect();
    const req = {
      company_id: company.id,
      posting_date: '2024-01-15',
      source_document_type: 'SALES_INVOICE',
      source_document_id: randomUUID(),
      idempotency_key: `SALES_INVOICE:${randomUUID()}:post:v1`,
      lines: [
        { account_id: receivable.id, debit_amount: 100, party_type: 'CUSTOMER', party_id: randomUUID() },
        { account_id: vatOutput.id, credit_amount: 100 },
      ],
    };
    await assert.rejects(() => svc.postAccountingDocument(req, tx), /requires tax_metadata/);

    req.lines[1].tax_metadata = { tax_code: 'VAT10', tax_rate: 0.1 };
    const posted = await svc.postAccountingDocument(req, tx);
    assert.strictEqual(posted.status, 'POSTED');
    assert.deepStrictEqual(db.tables.gl_entries[1].tax_metadata, req.lines[1].tax_metadata);
  });

  console.log('\nAll EW-01 targeted revision tests passed.');
})();
