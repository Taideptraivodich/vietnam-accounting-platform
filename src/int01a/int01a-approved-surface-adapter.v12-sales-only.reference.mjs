import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { Pool } = require('pg');
const { PostgresCompanySettingsRepository } = require('./repositories/PostgresCompanySettingsRepository.cjs');

const salesModule = require('../sales');
const { SalesPostingService, AccountContractResolver } = salesModule;

let pool;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for INT-01B approved surface adapter');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function getCompanyId(ctx = {}) {
  return ctx.company_id
    || ctx.companyId
    || ctx?.input?.company_id
    || ctx?.input?.companyId
    || ctx?.fixture?.company_id
    || ctx?.fixture?.companyId
    || process.env.MD01_COMPANY_ID;
}

function getPostingDate(ctx = {}) {
  return ctx.posting_date || ctx.postingDate || ctx?.input?.posting_date || ctx?.input?.postingDate || new Date().toISOString().slice(0, 10);
}

function getFirstValue(ctx = {}, names = []) {
  for (const name of names) {
    const value = ctx?.[name] ?? ctx?.input?.[name] ?? ctx?.fixture?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function makeTransactionManager(pgPool) {
  async function withTransaction(fn) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    withTransaction,
    runInTransaction: withTransaction,
  };
}

class PostgresAccountSettingsRepository {
  constructor({ pool: pgPool, schema = 'public' } = {}) {
    this.pool = pgPool;
    this.schema = assertIdentifier(schema, 'schema');
  }

  async getAccountByCompanyAndSubtype(companyId, subtype, tx) {
    if (!companyId) throw new Error('accountSettingsRepository: company_id is required');
    if (!subtype) throw new Error('accountSettingsRepository: account_subtype is required');
    const client = tx || this.pool;
    const result = await client.query(
      `SELECT id
         FROM ${quoteIdent(this.schema)}.accounts
        WHERE company_id = $1 AND account_subtype = $2
        ORDER BY id
        LIMIT 1`,
      [companyId, subtype]
    );
    const row = result.rows[0];
    if (!row) throw new Error(`accountSettingsRepository: account not found for company_id=${companyId}, subtype=${subtype}`);
    return row.id;
  }

  async resolveAccountId(companyId, subtype, tx) {
    return this.getAccountByCompanyAndSubtype(companyId, subtype, tx);
  }

  async findByCompanyAndSubtype(companyId, subtype, tx) {
    return this.getAccountByCompanyAndSubtype(companyId, subtype, tx);
  }
}

class PostgresSalesInvoiceRepository {
  constructor({ pool: pgPool, schema = 'public' } = {}) {
    this.pool = pgPool;
    this.schema = assertIdentifier(schema, 'schema');
  }

  async getById(companyId, invoiceId, tx) {
    const client = tx || this.pool;
    const invoice = await selectOne(client, this.schema, 'sales_invoices', { id: invoiceId, company_id: companyId });
    if (!invoice) throw new Error(`salesInvoiceRepository: sales invoice not found for company_id=${companyId}, id=${invoiceId}`);
    invoice.lines = await selectLines(client, this.schema, ['sales_invoice_lines'], ['sales_invoice_id', 'invoice_id'], companyId, invoiceId);
    return invoice;
  }

  async findById(companyId, invoiceId, tx) { return this.getById(companyId, invoiceId, tx); }
  async findByCompanyAndId(companyId, invoiceId, tx) { return this.getById(companyId, invoiceId, tx); }
  async getSalesInvoice(companyId, invoiceId, tx) { return this.getById(companyId, invoiceId, tx); }
  async markPosted(companyId, invoiceId, tx) { return updateStatus(tx || this.pool, this.schema, 'sales_invoices', companyId, invoiceId, 'posted'); }
  async markCancelled(companyId, invoiceId, tx) { return updateStatus(tx || this.pool, this.schema, 'sales_invoices', companyId, invoiceId, 'cancelled'); }
  async updateStatus(companyId, invoiceId, status, tx) { return updateStatus(tx || this.pool, this.schema, 'sales_invoices', companyId, invoiceId, status); }
}

class PostgresDeliveryNoteRepository {
  constructor({ pool: pgPool, schema = 'public' } = {}) {
    this.pool = pgPool;
    this.schema = assertIdentifier(schema, 'schema');
  }

  async getById(companyId, deliveryNoteId, tx) {
    const client = tx || this.pool;
    const deliveryNote = await selectOne(client, this.schema, 'delivery_notes', { id: deliveryNoteId, company_id: companyId });
    if (!deliveryNote) throw new Error(`deliveryNoteRepository: delivery note not found for company_id=${companyId}, id=${deliveryNoteId}`);
    deliveryNote.lines = await selectLines(client, this.schema, ['delivery_note_lines'], ['delivery_note_id'], companyId, deliveryNoteId);
    return deliveryNote;
  }

  async findById(companyId, deliveryNoteId, tx) { return this.getById(companyId, deliveryNoteId, tx); }
  async findByCompanyAndId(companyId, deliveryNoteId, tx) { return this.getById(companyId, deliveryNoteId, tx); }
  async getDeliveryNote(companyId, deliveryNoteId, tx) { return this.getById(companyId, deliveryNoteId, tx); }
  async markPosted(companyId, deliveryNoteId, tx) { return updateStatus(tx || this.pool, this.schema, 'delivery_notes', companyId, deliveryNoteId, 'posted'); }
  async markCancelled(companyId, deliveryNoteId, tx) { return updateStatus(tx || this.pool, this.schema, 'delivery_notes', companyId, deliveryNoteId, 'cancelled'); }
  async updateStatus(companyId, deliveryNoteId, status, tx) { return updateStatus(tx || this.pool, this.schema, 'delivery_notes', companyId, deliveryNoteId, status); }
}

function buildFailClosedDependency(name) {
  return new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      return async () => {
        throw new Error(`${name} approved dependency is not available in INT-01B v1.2 adapter composition`);
      };
    },
  });
}

function buildSalesPostingService() {
  if (typeof SalesPostingService !== 'function') throw new Error('Approved SalesPostingService export is required');
  if (typeof AccountContractResolver !== 'function') throw new Error('Approved AccountContractResolver export is required');

  const pgPool = getPool();
  const transactionManager = makeTransactionManager(pgPool);
  const companySettingsRepository = new PostgresCompanySettingsRepository({ pool: pgPool });
  const salesInvoiceRepository = new PostgresSalesInvoiceRepository({ pool: pgPool });
  const deliveryNoteRepository = new PostgresDeliveryNoteRepository({ pool: pgPool });
  const accountSettingsRepository = new PostgresAccountSettingsRepository({ pool: pgPool });
  const accountResolver = new AccountContractResolver({ accountSettingsRepository });

  return new SalesPostingService({
    transactionManager,
    salesInvoiceRepository,
    deliveryNoteRepository,
    companySettingsRepository,
    accountResolver,
    coreAccounting: buildFailClosedDependency('coreAccounting'),
    inventoryIssueService: buildFailClosedDependency('inventoryIssueService'),
    arLedger: buildFailClosedDependency('arLedger'),
    taxLedger: buildFailClosedDependency('taxLedger'),
  });
}

export async function postSalesDelivery(ctx = {}) {
  const company_id = getCompanyId(ctx);
  if (!company_id) throw new Error('postSalesDelivery requires company_id or MD01_COMPANY_ID');

  const invoice_id = getFirstValue(ctx, ['invoice_id', 'sales_invoice_id', 'salesInvoiceId']);
  const delivery_note_id = getFirstValue(ctx, ['delivery_note_id', 'deliveryNoteId']);
  const posting_date = getPostingDate(ctx);
  const service = buildSalesPostingService();
  const evidence = { company_id, posting_date };

  if (delivery_note_id && typeof service.postDeliveryNote === 'function') {
    evidence.delivery = await service.postDeliveryNote({
      company_id,
      delivery_note_id,
      posting_date,
      idempotency_key: getFirstValue(ctx, ['delivery_idempotency_key', 'idempotency_key']) || `int01a:delivery:${delivery_note_id}`,
    });
  }

  if (invoice_id && typeof service.postSalesInvoice === 'function') {
    evidence.invoice = await service.postSalesInvoice({
      company_id,
      invoice_id,
      posting_date,
      idempotency_key: getFirstValue(ctx, ['invoice_idempotency_key', 'idempotency_key']) || `int01a:sales-invoice:${invoice_id}`,
    });
  }

  if (!invoice_id && !delivery_note_id) {
    throw new Error('postSalesDelivery requires invoice_id/sales_invoice_id or delivery_note_id');
  }

  return normalizeOutput('postSalesDelivery', evidence);
}

export async function postPurchaseGrni() {
  throw new Error('INT-01B v1.2 does not replace the approved Purchase/GRNI adapter; preserve the existing INT-01B v1.1 purchase wiring.');
}

export async function settleArAp() {
  throw new Error('INT-01B v1.2 does not replace the approved AR/AP settlement adapter; preserve the existing INT-01B v1.1 AR/AP wiring.');
}

export async function postInventoryAdjustment() {
  throw new Error('INT-01B v1.2 does not replace the approved Inventory adapter; preserve the existing INT-01B v1.1 inventory wiring.');
}

export async function cancelDocument() {
  throw new Error('INT-01B v1.2 does not replace the approved cancellation adapter; preserve the existing INT-01B v1.1 cancellation wiring.');
}

export function __int01bBuildSalesPostingServiceForVerification() {
  return buildSalesPostingService;
}

function normalizeOutput(operation, evidence) {
  return {
    success: true,
    operation,
    status: 'submitted_to_approved_surface',
    evidence,
  };
}

async function selectOne(client, schema, tableName, where) {
  const keys = Object.keys(where);
  const clauses = keys.map((key, index) => `${quoteIdent(key)} = $${index + 1}`).join(' AND ');
  const sql = `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)} WHERE ${clauses} LIMIT 1`;
  const result = await client.query(sql, keys.map((key) => where[key]));
  return result.rows[0] || null;
}

async function tableExists(client, schema, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1`,
    [schema, tableName]
  );
  return result.rowCount > 0;
}

async function columnExists(client, schema, tableName, columnName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3 LIMIT 1`,
    [schema, tableName, columnName]
  );
  return result.rowCount > 0;
}

async function selectLines(client, schema, tableNames, fkColumns, companyId, documentId) {
  for (const tableName of tableNames) {
    if (!(await tableExists(client, schema, tableName))) continue;
    for (const fkColumn of fkColumns) {
      if (!(await columnExists(client, schema, tableName, fkColumn))) continue;
      const result = await client.query(
        `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)} WHERE company_id = $1 AND ${quoteIdent(fkColumn)} = $2 ORDER BY id`,
        [companyId, documentId]
      );
      return result.rows;
    }
  }
  return [];
}

async function updateStatus(client, schema, tableName, companyId, id, status) {
  const updates = ['status = $3'];
  if (await columnExists(client, schema, tableName, 'posted_at') && status === 'posted') updates.push('posted_at = CURRENT_TIMESTAMP');
  if (await columnExists(client, schema, tableName, 'cancelled_at') && status === 'cancelled') updates.push('cancelled_at = CURRENT_TIMESTAMP');
  const sql = `UPDATE ${quoteIdent(schema)}.${quoteIdent(tableName)} SET ${updates.join(', ')} WHERE company_id = $1 AND id = $2 RETURNING *`;
  const result = await client.query(sql, [companyId, id, status]);
  if (!result.rows[0]) throw new Error(`${tableName}: document not found for company_id=${companyId}, id=${id}`);
  return result.rows[0];
}

function assertIdentifier(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(value || ''))) {
    throw new Error(`Invalid ${label} identifier: ${value}`);
  }
  return String(value);
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default {
  postSalesDelivery,
  postPurchaseGrni,
  settleArAp,
  postInventoryAdjustment,
  cancelDocument,
};
