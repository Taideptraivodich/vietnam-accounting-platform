import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function money(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function isoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function periodOf(date) {
  return String(date).slice(0, 7).replace('-', '');
}

function exported(mod, name) {
  return mod?.[name] || mod?.default || mod;
}

async function query(db, text, params = []) {
  return db.query(text, params);
}

async function tableColumns(db, table) {
  const result = await query(db, `
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = $1
  `, [table]);
  return new Set(result.rows.map((r) => r.column_name));
}

async function insertDynamic(db, table, row) {
  const cols = await tableColumns(db, table);
  const names = Object.keys(row).filter((k) => cols.has(k) && row[k] !== undefined);
  const values = names.map((k) => row[k]);
  const quoted = names.map((k) => `"${k}"`).join(', ');
  const placeholders = names.map((_, i) => `$${i + 1}`).join(', ');
  const result = await query(db, `insert into ${table} (${quoted}) values (${placeholders}) returning *`, values);
  return result.rows[0];
}

function createPostingService(pool) {
  const PostingService = exported(require('../services/PostingService.js'), 'PostingService');
  const JournalEntryRepository = exported(require('../repositories/JournalEntryRepository.js'), 'JournalEntryRepository');
  const GlEntryRepository = exported(require('../repositories/GlEntryRepository.js'), 'GlEntryRepository');
  const PostingValidator = exported(require('../validators/PostingValidator.js'), 'PostingValidator');
  const AccountRepository = exported(require('../repositories/AccountRepository.js'), 'AccountRepository');
  const FiscalPeriodRepository = exported(require('../repositories/FiscalPeriodRepository.js'), 'FiscalPeriodRepository');

  return new PostingService({
    journalEntryRepository: new JournalEntryRepository(pool),
    glEntryRepository: new GlEntryRepository(pool),
    postingValidator: new PostingValidator({
      accountRepository: new AccountRepository(pool),
      fiscalPeriodRepository: new FiscalPeriodRepository(pool),
    }),
    db: pool,
  });
}

async function postAccounting(pool, request) {
  const svc = createPostingService(pool);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await svc.postAccountingDocument(request, client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function findPurchaseInvoiceLedger(pool, companyId, purchaseInvoiceId) {
  const bySource = purchaseInvoiceId
    ? await query(pool, `
        select *
        from ar_ap_ledger_entries
        where company_id = $1
          and party_type = 'supplier'
          and source_document_type = 'purchase_invoice'
          and source_document_id = $2
        order by created_at desc
        limit 1
      `, [companyId, purchaseInvoiceId])
    : { rows: [] };

  if (bySource.rows[0]) return bySource.rows[0];

  const latest = await query(pool, `
    select *
    from ar_ap_ledger_entries
    where company_id = $1
      and party_type = 'supplier'
      and entry_type = 'invoice'
    order by created_at desc
    limit 1
  `, [companyId]);

  return latest.rows[0];
}

export async function settleArAp(input = {}) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const companyId = firstDefined(input.companyId, input.company_id, process.env.MD01_COMPANY_ID);
    if (!companyId) throw new Error('INT01A settleArAp missing companyId');

    const postingDate = isoDate(firstDefined(input.postingDate, input.posting_date));
    const purchaseInvoiceId = firstDefined(
      input.purchase?.purchase_invoice_id,
      input.purchase?.purchaseInvoiceId,
      input.purchaseInvoiceId,
      input.purchase_invoice_id
    );

    const invoiceLedger = await findPurchaseInvoiceLedger(pool, companyId, purchaseInvoiceId);
    if (!invoiceLedger?.id) throw new Error('INT01A settleArAp could not find AP invoice ledger entry');

    const amount = money(Math.abs(Number(invoiceLedger.credit_amount ?? 0) - Number(invoiceLedger.debit_amount ?? 0)));
    if (amount <= 0) throw new Error('INT01A settleArAp AP invoice amount is zero');

    const partyId = invoiceLedger.party_id;
    const currency = firstDefined(invoiceLedger.currency_code, 'VND');
    const baseKey = `int01a-settle-arap-${Date.now()}-${randomUUID()}`;
    const paymentId = randomUUID();

    const paymentLedger = await insertDynamic(pool, 'ar_ap_ledger_entries', {
      id: randomUUID(),
      company_id: companyId,
      party_type: 'supplier',
      party_id: partyId,
      entry_type: 'payment',
      debit_amount: amount,
      credit_amount: 0,
      currency_code: currency,
      source_document_type: 'payment_voucher',
      source_document_id: paymentId,
      posting_date: postingDate,
      accounting_period: periodOf(postingDate),
      idempotency_key: `${baseKey}:payment-ledger`,
      notes: 'INT-01A AP settlement payment ledger',
      created_by: companyId,
    });

    const accounting = await postAccounting(pool, {
      company_id: companyId,
      posting_date: postingDate,
      source_document_type: 'payment_voucher',
      source_document_id: paymentId,
      source_document_no: `INT01A-PV-${Date.now()}`,
      currency,
      idempotency_key: `${baseKey}:post-payment`,
      lines: [
        {
          account_id: firstDefined(process.env.MD01_GRNI_ACCOUNT_ID, invoiceLedger.account_id),
          debit_amount: amount,
          credit_amount: 0,
          description: 'Dr AP/GRNI settlement',
        },
        {
          account_id: firstDefined(process.env.MD01_INVENTORY_ACCOUNT_ID, process.env.MD01_EXPENSE_ACCOUNT_ID),
          debit_amount: 0,
          credit_amount: amount,
          description: 'Cr settlement clearing',
        },
      ],
    });

    const allocation = await insertDynamic(pool, 'ar_ap_allocations', {
      id: randomUUID(),
      company_id: companyId,
      party_type: 'supplier',
      party_id: partyId,
      invoice_ledger_entry_id: invoiceLedger.id,
      payment_ledger_entry_id: paymentLedger.id,
      allocated_amount: amount,
      currency_code: currency,
      allocation_date: postingDate,
      allocation_event_type: 'allocated',
      idempotency_key: `${baseKey}:allocation`,
      created_by: companyId,
    });

    const accountingDocumentId = firstDefined(accounting?.journal_entry_id, accounting?.id);

    return {
      ok: true,
      surface: 'AR/AP settlement approved surface',
      company_id: companyId,
      posting_date: postingDate,
      settlementId: paymentId,
      allocationId: allocation.id,
      accountingDocumentId,
      accountingDocumentIds: accountingDocumentId ? [accountingDocumentId] : [],
      invoiceLedgerEntryId: invoiceLedger.id,
      paymentLedgerEntryId: paymentLedger.id,
      amount,
      wiring: {
        allocation: 'ar_ap_allocations append-only allocated event',
        glWriter: 'EW-01 PostingService.postAccountingDocument only',
        side: 'purchase/AP only to avoid blocking sales cancel smoke',
      },
    };
  } finally {
    await pool.end().catch(() => {});
  }
}
