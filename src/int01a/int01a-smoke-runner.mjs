#!/usr/bin/env node
/**
 * INT-01A Executable Cross-Module Smoke Runner — Final Integration Gate v1.0.3
 *
 * Scope:
 *   - Executable integration runner only.
 *   - Uses real PostgreSQL through DATABASE_URL.
 *   - Requires MD-01 seed/preseed real IDs.
 *   - Calls approved module surfaces through an adapter module or existing command wrappers.
 *   - Fails closed when a required invariant cannot be verified.
 *
 * Non-goals:
 *   - No business logic implementation.
 *   - No architecture/schema/rule change.
 *   - No SQLite or fake-pass fixtures.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import process from 'node:process';

async function loadPgClient() {
  try {
    const pg = await import('pg');
    return pg.Client;
  } catch (error) {
    throw new SmokeFailure('Missing dependency: pg. Run npm install, or install pg in the candidate tree.', { cause: error?.message ?? String(error), exitCode: 2 });
  }
}

const RUNNER_VERSION = 'INT-01A_P0_v1.0';
const DEFAULT_REPORT_DIR = 'reports/int01a';
const MONEY_EPSILON = Number(process.env.INT01A_MONEY_EPSILON ?? '0.0001');
const REQUIRED_ENV = [
  'DATABASE_URL',
  'NODE_ENV',
  'MD01_COMPANY_ID',
  'MD01_INVENTORY_ACCOUNT_ID',
  'MD01_COGS_ACCOUNT_ID',
  'MD01_REVENUE_ACCOUNT_ID',
  'MD01_EXPENSE_ACCOUNT_ID',
];

const TABLE_ALIASES = {
  companies: ['companies', 'company'],
  accounts: ['accounts', 'chart_of_accounts', 'gl_accounts', 'accounting_accounts'],
  customers: ['customers', 'ar_customers'],
  suppliers: ['suppliers', 'vendors', 'ap_suppliers'],
  items: ['items', 'inventory_items', 'products', 'stock_items'],
  warehouses: ['warehouses', 'inventory_warehouses', 'locations', 'stock_locations'],
  migrations: ['_prisma_migrations', 'knex_migrations', 'drizzle__migrations', 'schema_migrations', 'sequelize_meta', 'migrations'],
  accountingDocuments: ['accounting_documents', 'gl_documents', 'journal_documents', 'journal_entries', 'journals'],
  glEntries: ['accounting_entries', 'gl_entries', 'journal_lines', 'general_ledger_entries', 'ledger_entries'],
  vatLedger: ['vat_ledger_entries', 'vat_entries', 'tax_ledger_entries', 'vat_ledger'],
  arLedger: ['ar_ledger_entries', 'receivables_ledger_entries', 'accounts_receivable_entries', 'ar_entries'],
  apLedger: ['ap_ledger_entries', 'payables_ledger_entries', 'accounts_payable_entries', 'ap_entries'],
  arapAllocations: ['ar_ap_allocations', 'arap_allocations', 'settlement_allocations', 'payment_allocations', 'allocations'],
  inventoryLedger: ['inventory_ledger_entries', 'stock_ledger_entries', 'inventory_movements', 'stock_movements'],
  stockBalances: ['stock_balances', 'inventory_balances', 'warehouse_item_balances', 'stock_on_hand'],
  salesInvoices: ['sales_invoices', 'sale_invoices', 'customer_invoices', 'invoices'],
  deliveries: ['delivery_notes', 'sales_deliveries', 'deliveries', 'shipment_documents'],
  purchaseReceipts: ['purchase_receipts', 'goods_receipts', 'grns', 'goods_received_notes'],
  purchaseInvoices: ['purchase_invoices', 'vendor_invoices', 'supplier_invoices', 'ap_invoices'],
};

const COLUMN_ALIASES = {
  id: ['id', 'uuid', 'code'],
  companyId: ['company_id', 'companyId', 'tenant_id', 'organization_id'],
  accountingDocumentId: ['accounting_document_id', 'accountingDocumentId', 'gl_document_id', 'journal_id', 'journal_entry_id', 'document_id'],
  sourceDocumentId: ['source_document_id', 'sourceDocumentId', 'source_id', 'document_id'],
  sourceDocumentType: ['source_document_type', 'sourceDocumentType', 'source_type', 'document_type'],
  debit: ['debit', 'debit_amount', 'debitAmount', 'dr_amount'],
  credit: ['credit', 'credit_amount', 'creditAmount', 'cr_amount'],
  signedAmount: ['amount', 'signed_amount', 'signedAmount'],
  accountId: ['account_id', 'accountId', 'gl_account_id'],
  subtype: ['subtype', 'account_subtype', 'accountSubtype', 'type', 'account_type'],
  createdAt: ['created_at', 'createdAt', 'inserted_at'],
  updatedAt: ['updated_at', 'updatedAt'],
  inventoryLedgerId: ['inventory_ledger_entry_id', 'inventoryLedgerEntryId', 'stock_ledger_entry_id', 'movement_id'],
  quantity: ['quantity', 'qty', 'movement_quantity'],
};

class SmokeFailure extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'SmokeFailure';
    this.details = details;
  }
}

class Reporter {
  constructor({ runId, reportDir }) {
    this.runId = runId;
    this.reportDir = reportDir;
    this.startedAt = new Date().toISOString();
    this.steps = [];
    this.openIssues = [];
  }

  async step(id, title, fn) {
    const startedAt = new Date().toISOString();
    const step = { id, title, status: 'RUNNING', startedAt, endedAt: null, durationMs: null, evidence: null, error: null };
    this.steps.push(step);
    const t0 = Date.now();
    process.stdout.write(`[INT-01A] ${id} ${title} ... `);
    try {
      const evidence = await fn();
      step.status = evidence?.status === 'WARN' ? 'WARN' : 'PASS';
      step.evidence = evidence ?? {};
      process.stdout.write(`${step.status}\n`);
      return evidence;
    } catch (error) {
      step.status = 'FAIL';
      step.error = normalizeError(error);
      process.stdout.write('FAIL\n');
      this.openIssues.push({ step: id, title, error: step.error });
      throw error;
    } finally {
      step.endedAt = new Date().toISOString();
      step.durationMs = Date.now() - t0;
    }
  }

  status() {
    return this.steps.some((s) => s.status === 'FAIL') ? 'FAIL' : this.steps.some((s) => s.status === 'WARN') ? 'WARN' : 'PASS';
  }

  async write(extra = {}) {
    await fs.mkdir(this.reportDir, { recursive: true });
    const endedAt = new Date().toISOString();
    const payload = {
      runner: RUNNER_VERSION,
      runId: this.runId,
      status: this.status(),
      startedAt: this.startedAt,
      endedAt,
      environment: {
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        databaseUrlRedacted: redactDatabaseUrl(process.env.DATABASE_URL),
      },
      steps: this.steps,
      openIssues: this.openIssues,
      ...extra,
    };
    const jsonPath = path.join(this.reportDir, `int01a-smoke-result-${this.runId}.json`);
    const mdPath = path.join(this.reportDir, `INT01A_SMOKE_TEST_RESULT_${this.runId}.md`);
    await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2) + '\n');
    await fs.writeFile(mdPath, toMarkdown(payload));
    return { jsonPath, mdPath, payload };
  }
}

function usage() {
  return `INT-01A Executable Cross-Module Smoke Runner

Usage:
  npm run int01a:smoke
  node ./src/int01a/int01a-smoke-runner.mjs [--out reports/int01a] [--adapter ./path/to/adapter.mjs]

Required env:
  DATABASE_URL
  NODE_ENV=integration
  MD01_COMPANY_ID
  MD01_INVENTORY_ACCOUNT_ID
  MD01_COGS_ACCOUNT_ID
  MD01_REVENUE_ACCOUNT_ID
  MD01_EXPENSE_ACCOUNT_ID

Binding to approved module surfaces:
  Preferred: INT01A_ADAPTER_MODULE=./path/to/int01a-approved-surface-adapter.mjs
  Alternative command contract: set all INT01A_*_COMMAND env vars documented in EXPECTED_ENVIRONMENT_VARIABLES.md

This runner fails closed if the adapter/commands or database invariants cannot be verified.`;
}

function procedureText() {
  return `INT-01A executable smoke procedure:
1. Validate required env and NODE_ENV=integration.
2. Connect to real PostgreSQL using DATABASE_URL.
3. Detect migration metadata and required freeze-scope tables.
4. Verify MD-01 seed/preseed real IDs exist.
5. Load approved module adapter or command wrappers.
6. Execute Sales/Delivery baseline via approved surface.
7. Execute Purchase/GRNI baseline via approved surface.
8. Verify VAT ledger baseline from sales/purchase, or explicit VAT command if configured.
9. Execute AR/AP settlement via approved surface.
10. Execute inventory movement/adjustment via approved surface.
11. Query GL entries and verify Debit = Credit.
12. Verify company_id isolation where columns support it.
13. Verify inventory ledger ↔ GL linkage where columns support it.
14. Cancel one document and verify append-only reversal.
15. Write JSON + Markdown report and exit non-zero on any failed invariant.`;
}

function parseArgs(argv) {
  const args = { reportDir: process.env.INT01A_REPORT_DIR || DEFAULT_REPORT_DIR, adapter: process.env.INT01A_ADAPTER_MODULE || null, help: false, procedure: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--procedure') args.procedure = true;
    else if (arg === '--out') args.reportDir = argv[++i];
    else if (arg === '--adapter') args.adapter = argv[++i];
    else throw new SmokeFailure(`Unknown argument: ${arg}`, { usage: usage() });
  }
  return args;
}

function normalizeError(error) {
  return {
    name: error?.name ?? 'Error',
    message: error?.message ?? String(error),
    details: error?.details ?? undefined,
    stack: process.env.INT01A_INCLUDE_STACK === '1' ? error?.stack : undefined,
  };
}

function redactDatabaseUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = parsed.username ? `${parsed.username}` : '';
    return parsed.toString();
  } catch {
    return '<redacted-invalid-url>';
  }
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function quoteTable(table) {
  if (typeof table === 'object') return `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`;
  return String(table).split('.').map(quoteIdent).join('.');
}

function parseEnvList(name) {
  return (process.env[name] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function envTableName(kind) {
  const envName = `INT01A_TABLE_${kind.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`;
  return process.env[envName];
}

async function tableExists(client, tableName) {
  if (!tableName) return null;
  const parts = tableName.split('.');
  const schema = parts.length === 2 ? parts[0] : null;
  const name = parts.length === 2 ? parts[1] : parts[0];
  let query;
  let values;
  if (schema) {
    query = `select table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and table_schema=$1 and table_name=$2 limit 1`;
    values = [schema, name];
  } else {
    query = `select table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and table_schema not in ('pg_catalog','information_schema') and table_name=$1 order by case when table_schema='public' then 0 else 1 end, table_schema limit 1`;
    values = [name];
  }
  const res = await client.query(query, values);
  return res.rows[0] ? { schema: res.rows[0].table_schema, name: res.rows[0].table_name, key: tableName } : null;
}

async function resolveTable(client, kind, { required = true } = {}) {
  const explicit = envTableName(kind);
  if (explicit) {
    const found = await tableExists(client, explicit);
    if (!found && required) throw new SmokeFailure(`Configured table ${explicit} for ${kind} does not exist`, { env: `INT01A_TABLE_${kind.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}` });
    return found;
  }
  for (const alias of TABLE_ALIASES[kind] || []) {
    const found = await tableExists(client, alias);
    if (found) return found;
  }
  if (required) throw new SmokeFailure(`Required table group not found for ${kind}`, { aliases: TABLE_ALIASES[kind] || [] });
  return null;
}

async function columnsFor(client, table) {
  const res = await client.query(
    `select column_name from information_schema.columns where table_schema=$1 and table_name=$2`,
    [table.schema, table.name],
  );
  return new Set(res.rows.map((r) => r.column_name));
}

function resolveColumn(columns, role, { required = true, tableKind = null } = {}) {
  const aliases = COLUMN_ALIASES[role] || [];
  const explicitName = tableKind ? process.env[`INT01A_COLUMN_${tableKind.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}_${role.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`] : null;
  const candidates = explicitName ? [explicitName, ...aliases] : aliases;
  for (const c of candidates) {
    if (columns.has(c)) return c;
  }
  if (required) throw new SmokeFailure(`Required column not found for role ${role}`, { aliases, tableKind });
  return null;
}

async function scalar(client, sql, values = []) {
  const res = await client.query(sql, values);
  return res.rows[0] ? Object.values(res.rows[0])[0] : null;
}

async function countTable(client, table, where = '', values = []) {
  return Number(await scalar(client, `select count(*)::int from ${quoteTable(table)} ${where}`, values));
}

async function getById(client, table, id, { tableKind }) {
  const columns = await columnsFor(client, table);
  const idCol = resolveColumn(columns, 'id', { tableKind });
  const res = await client.query(`select * from ${quoteTable(table)} where ${quoteIdent(idCol)}::text=$1 limit 1`, [String(id)]);
  return res.rows[0] ?? null;
}

async function countByCompany(client, table, companyId, { tableKind }) {
  const columns = await columnsFor(client, table);
  const companyCol = resolveColumn(columns, 'companyId', { required: false, tableKind });
  if (!companyCol) return { count: await countTable(client, table), scoped: false, companyCol: null };
  return {
    count: await countTable(client, table, `where ${quoteIdent(companyCol)}::text=$1`, [String(companyId)]),
    scoped: true,
    companyCol,
  };
}

function ensureRequiredEnv() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new SmokeFailure('Missing required environment variables', {
      missing,
      reproduction: 'Export the variables listed in EXPECTED_ENVIRONMENT_VARIABLES.md and rerun npm run int01a:smoke.',
    });
  }
  if (process.env.NODE_ENV !== 'integration') {
    throw new SmokeFailure('NODE_ENV must be exactly integration for INT-01A smoke runner', {
      actual: process.env.NODE_ENV,
      expected: 'integration',
    });
  }
  const dbUrl = String(process.env.DATABASE_URL);
  if (/sqlite/i.test(dbUrl) || dbUrl.startsWith('file:')) {
    throw new SmokeFailure('SQLite/file database URL is not allowed for INT-01A', { databaseUrlRedacted: redactDatabaseUrl(dbUrl) });
  }
}

async function validatePostgres(client) {
  const res = await client.query(`select version() as version, current_database() as database, current_schema() as schema`);
  const row = res.rows[0];
  if (!/postgresql/i.test(row.version)) {
    throw new SmokeFailure('Connected database is not PostgreSQL', { version: row.version });
  }
  return { postgresVersion: row.version, database: row.database, schema: row.schema };
}

async function detectTables(client) {
  const requiredKinds = [
    'companies', 'accounts', 'customers', 'suppliers', 'items', 'warehouses',
    'accountingDocuments', 'glEntries', 'vatLedger', 'arLedger', 'apLedger',
    'inventoryLedger', 'stockBalances', 'salesInvoices', 'purchaseReceipts', 'purchaseInvoices',
  ];
  const optionalKinds = ['migrations', 'arapAllocations', 'deliveries'];
  const tables = {};
  for (const kind of requiredKinds) tables[kind] = await resolveTable(client, kind, { required: true });
  for (const kind of optionalKinds) tables[kind] = await resolveTable(client, kind, { required: false });

  const migrationInfo = tables.migrations
    ? { migrationTable: `${tables.migrations.schema}.${tables.migrations.name}`, rows: await countTable(client, tables.migrations) }
    : { migrationTable: null, rows: null, warning: 'No common migration metadata table detected; required freeze-scope tables are used as migration-applied evidence.' };
  if (tables.migrations && migrationInfo.rows === 0) {
    throw new SmokeFailure('Migration metadata table exists but contains zero rows', migrationInfo);
  }
  return { tables, migrationInfo };
}

async function verifySeed(client, tables) {
  const companyId = process.env.MD01_COMPANY_ID;
  const company = await getById(client, tables.companies, companyId, { tableKind: 'companies' });
  if (!company) throw new SmokeFailure('MD01_COMPANY_ID does not exist in companies table', { companyId });

  const masterData = {};
  for (const kind of ['customers', 'suppliers', 'items', 'warehouses']) {
    const countInfo = await countByCompany(client, tables[kind], companyId, { tableKind: kind });
    if (countInfo.count < 1) throw new SmokeFailure(`MD-01 seed missing required ${kind}`, { table: tables[kind], companyId, ...countInfo });
    masterData[kind] = countInfo;
  }

  const accountIds = {
    inventory: process.env.MD01_INVENTORY_ACCOUNT_ID,
    cogs: process.env.MD01_COGS_ACCOUNT_ID,
    revenue: process.env.MD01_REVENUE_ACCOUNT_ID,
    expense: process.env.MD01_EXPENSE_ACCOUNT_ID,
    grni: process.env.MD01_GRNI_ACCOUNT_ID || null,
    vatOutput: process.env.MD01_OUTPUT_VAT_ACCOUNT_ID || null,
    vatInput: process.env.MD01_INPUT_VAT_ACCOUNT_ID || null,
    ar: process.env.MD01_AR_ACCOUNT_ID || null,
    ap: process.env.MD01_AP_ACCOUNT_ID || null,
  };
  const accountChecks = {};
  for (const [name, id] of Object.entries(accountIds)) {
    if (!id) continue;
    const account = await getById(client, tables.accounts, id, { tableKind: 'accounts' });
    if (!account) throw new SmokeFailure(`Required account env ID does not exist: ${name}`, { envAccount: name, id });
    accountChecks[name] = { id, exists: true };
  }

  const accountsColumns = await columnsFor(client, tables.accounts);
  const subtypeCol = resolveColumn(accountsColumns, 'subtype', { required: false, tableKind: 'accounts' });
  if (!subtypeCol) {
    throw new SmokeFailure('Cannot verify GRNI account subtype: accounts subtype/type column not found', { table: tables.accounts, aliases: COLUMN_ALIASES.subtype });
  }
  const badSubtypes = await client.query(
    `select ${quoteIdent(resolveColumn(accountsColumns, 'id', { tableKind: 'accounts' }))}::text as id, ${quoteIdent(subtypeCol)}::text as subtype from ${quoteTable(tables.accounts)} where lower(${quoteIdent(subtypeCol)}::text) in ('grni','tk151') limit 20`,
  );
  if (badSubtypes.rowCount > 0) {
    throw new SmokeFailure('Invalid GRNI subtype detected; expected goods_received_not_invoiced, not grni/TK151', { rows: badSubtypes.rows });
  }
  const grniRows = await client.query(
    `select count(*)::int as count from ${quoteTable(tables.accounts)} where lower(${quoteIdent(subtypeCol)}::text)='goods_received_not_invoiced'`,
  );
  if (Number(grniRows.rows[0].count) < 1) {
    throw new SmokeFailure('No account subtype goods_received_not_invoiced found for GRNI baseline', { subtypeColumn: subtypeCol });
  }

  return { companyId, companyExists: true, masterData, accountChecks, grniSubtype: { subtypeColumn: subtypeCol, goodsReceivedNotInvoicedRows: Number(grniRows.rows[0].count) } };
}

async function snapshotCounts(client, tables, companyId) {
  const result = {};
  for (const [kind, table] of Object.entries(tables)) {
    if (!table || kind === 'migrations') continue;
    result[kind] = await countByCompany(client, table, companyId, { tableKind: kind });
  }
  return result;
}

function buildSmokeContext({ runId, seed, tables }) {
  return {
    runId,
    runnerVersion: RUNNER_VERSION,
    companyId: process.env.MD01_COMPANY_ID,
    accountIds: {
      inventory: process.env.MD01_INVENTORY_ACCOUNT_ID,
      cogs: process.env.MD01_COGS_ACCOUNT_ID,
      revenue: process.env.MD01_REVENUE_ACCOUNT_ID,
      expense: process.env.MD01_EXPENSE_ACCOUNT_ID,
      ar: process.env.MD01_AR_ACCOUNT_ID || null,
      ap: process.env.MD01_AP_ACCOUNT_ID || null,
      grni: process.env.MD01_GRNI_ACCOUNT_ID || null,
      inputVat: process.env.MD01_INPUT_VAT_ACCOUNT_ID || null,
      outputVat: process.env.MD01_OUTPUT_VAT_ACCOUNT_ID || null,
    },
    optionalSeedIds: {
      customerId: process.env.MD01_CUSTOMER_ID || null,
      supplierId: process.env.MD01_SUPPLIER_ID || null,
      itemId: process.env.MD01_ITEM_ID || null,
      warehouseId: process.env.MD01_WAREHOUSE_ID || null,
    },
    deterministicAmounts: {
      salesNet: process.env.INT01A_SALES_NET_AMOUNT || '1000.00',
      salesVat: process.env.INT01A_SALES_VAT_AMOUNT || '100.00',
      purchaseNet: process.env.INT01A_PURCHASE_NET_AMOUNT || '600.00',
      purchaseVat: process.env.INT01A_PURCHASE_VAT_AMOUNT || '60.00',
      inventoryQuantity: process.env.INT01A_INVENTORY_QUANTITY || '2',
    },
    seedEvidence: seed,
    resolvedTables: Object.fromEntries(Object.entries(tables).map(([k, t]) => [k, t ? `${t.schema}.${t.name}` : null])),
  };
}

async function loadAdapter(adapterPath) {
  if (adapterPath) {
    const abs = path.isAbsolute(adapterPath) ? adapterPath : path.resolve(process.cwd(), adapterPath);
    let mod;
    try {
      mod = await import(pathToFileURL(abs).href);
    } catch (error) {
      throw new SmokeFailure('Unable to import INT-01A adapter module', { adapterPath: abs, cause: error.message, reproduction: `Check INT01A_ADAPTER_MODULE=${adapterPath}` });
    }
    const adapter = typeof mod.createInt01aAdapter === 'function'
      ? await mod.createInt01aAdapter()
      : (mod.default || mod.adapter || mod);
    validateAdapter(adapter, { mode: 'module', adapterPath: abs });
    return { mode: 'module', adapter };
  }

  const commandAdapter = buildCommandAdapter();
  if (commandAdapter) {
    validateAdapter(commandAdapter, { mode: 'commands' });
    return { mode: 'commands', adapter: commandAdapter };
  }

  throw new SmokeFailure('No approved module surface binding configured for INT-01A', {
    requiredOneOf: [
      'INT01A_ADAPTER_MODULE pointing to a local adapter that calls existing approved services/APIs',
      'All INT01A_*_COMMAND variables for existing command wrappers',
    ],
    reproduction: 'Create/bind an adapter in the local candidate tree, or export the command variables listed in EXPECTED_ENVIRONMENT_VARIABLES.md, then rerun npm run int01a:smoke.',
    strictRule: 'Runner will not implement business logic or fake module calls.',
  });
}

function validateAdapter(adapter, meta = {}) {
  const required = ['postSalesDelivery', 'postPurchaseGrni', 'settleArAp', 'postInventoryAdjustment', 'cancelDocument'];
  const missing = required.filter((name) => typeof adapter?.[name] !== 'function');
  if (missing.length) throw new SmokeFailure('INT-01A adapter is missing required functions', { missing, ...meta });
}

function buildCommandAdapter() {
  const commands = {
    postSalesDelivery: process.env.INT01A_POST_SALES_DELIVERY_COMMAND,
    postPurchaseGrni: process.env.INT01A_POST_PURCHASE_GRNI_COMMAND,
    postVatLedger: process.env.INT01A_POST_VAT_LEDGER_COMMAND,
    settleArAp: process.env.INT01A_SETTLE_ARAP_COMMAND,
    postInventoryAdjustment: process.env.INT01A_POST_INVENTORY_ADJUSTMENT_COMMAND,
    cancelDocument: process.env.INT01A_CANCEL_DOCUMENT_COMMAND,
  };
  const required = ['postSalesDelivery', 'postPurchaseGrni', 'settleArAp', 'postInventoryAdjustment', 'cancelDocument'];
  const any = Object.values(commands).some(Boolean);
  if (!any) return null;
  const missing = required.filter((name) => !commands[name]);
  if (missing.length) {
    throw new SmokeFailure('Incomplete command adapter configuration', { missing, commands: Object.fromEntries(Object.entries(commands).map(([k, v]) => [k, Boolean(v)])) });
  }
  const make = (name) => async (ctx) => runCommand(commands[name], ctx, name);
  return {
    postSalesDelivery: make('postSalesDelivery'),
    postPurchaseGrni: make('postPurchaseGrni'),
    postVatLedger: commands.postVatLedger ? make('postVatLedger') : undefined,
    settleArAp: make('settleArAp'),
    postInventoryAdjustment: make('postInventoryAdjustment'),
    cancelDocument: make('cancelDocument'),
  };
}

async function runCommand(command, input, name) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, INT01A_SMOKE_INPUT: JSON.stringify(input) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.stdin.end(JSON.stringify(input));
    child.on('error', (error) => reject(new SmokeFailure(`Command failed to start for ${name}`, { command, cause: error.message })));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new SmokeFailure(`Command exited non-zero for ${name}`, { command, exitCode: code, stdout: stdout.slice(-4000), stderr: stderr.slice(-4000) }));
        return;
      }
      const trimmed = stdout.trim();
      if (!trimmed) {
        reject(new SmokeFailure(`Command returned empty stdout for ${name}; expected JSON result`, { command }));
        return;
      }
      try {
        resolve(JSON.parse(trimmed));
      } catch (error) {
        reject(new SmokeFailure(`Command stdout is not valid JSON for ${name}`, { command, stdout: trimmed.slice(-4000), cause: error.message }));
      }
    });
  });
}

function documentIdsFrom(...results) {
  const ids = [];
  for (const result of results) {
    if (!result) continue;
    for (const key of ['accountingDocumentId', 'glDocumentId', 'journalId', 'documentId', 'reversalAccountingDocumentId', 'reversalDocumentId']) {
      if (result[key]) ids.push(String(result[key]));
    }
    if (Array.isArray(result.accountingDocumentIds)) ids.push(...result.accountingDocumentIds.map(String));
    if (Array.isArray(result.glDocumentIds)) ids.push(...result.glDocumentIds.map(String));
  }
  return [...new Set(ids)];
}

function sourceIdsFrom(...results) {
  const ids = [];
  for (const result of results) {
    if (!result) continue;
    for (const key of ['sourceDocumentId', 'salesInvoiceId', 'deliveryId', 'purchaseReceiptId', 'purchaseInvoiceId', 'documentId', 'inventoryDocumentId']) {
      if (result[key]) ids.push(String(result[key]));
    }
  }
  return [...new Set(ids)];
}

function requireResult(result, name, acceptedKeys) {
  if (!result || typeof result !== 'object') throw new SmokeFailure(`${name} returned no JSON object`, { result });
  const hasAny = acceptedKeys.some((k) => result[k] || (Array.isArray(result[k]) && result[k].length));
  if (!hasAny) throw new SmokeFailure(`${name} did not return required document identifiers`, { acceptedKeys, result });
  return result;
}

async function assertCountsIncreased(before, after, kinds, reason) {
  const failures = [];
  const evidence = {};
  for (const kind of kinds) {
    const b = before[kind]?.count ?? 0;
    const a = after[kind]?.count ?? 0;
    evidence[kind] = { before: b, after: a, delta: a - b };
    if (!(a > b)) failures.push({ kind, before: b, after: a, reason });
  }
  if (failures.length) throw new SmokeFailure(`Expected ledger/table counts to increase: ${reason}`, { failures, evidence });
  return evidence;
}

async function assertCountsNotDecreased(before, after, kinds, reason) {
  const failures = [];
  const evidence = {};
  for (const kind of kinds) {
    const b = before[kind]?.count ?? 0;
    const a = after[kind]?.count ?? 0;
    evidence[kind] = { before: b, after: a, delta: a - b };
    if (a < b) failures.push({ kind, before: b, after: a, reason });
  }
  if (failures.length) throw new SmokeFailure(`Append-only count check failed: ${reason}`, { failures, evidence });
  return evidence;
}

async function glSumsByDocuments(client, tables, documentIds) {
  if (!documentIds.length) throw new SmokeFailure('No accounting document IDs available for GL verification');
  const table = tables.glEntries;
  const columns = await columnsFor(client, table);
  const docCol = resolveColumn(columns, 'accountingDocumentId', { tableKind: 'glEntries' });
  const debitCol = resolveColumn(columns, 'debit', { required: false, tableKind: 'glEntries' });
  const creditCol = resolveColumn(columns, 'credit', { required: false, tableKind: 'glEntries' });
  const signedCol = resolveColumn(columns, 'signedAmount', { required: false, tableKind: 'glEntries' });
  const companyCol = resolveColumn(columns, 'companyId', { required: false, tableKind: 'glEntries' });

  if (debitCol && creditCol) {
    const res = await client.query(
      `select ${quoteIdent(docCol)}::text as document_id,
              coalesce(sum(${quoteIdent(debitCol)}::numeric),0)::text as debit,
              coalesce(sum(${quoteIdent(creditCol)}::numeric),0)::text as credit,
              count(*)::int as row_count,
              ${companyCol ? `count(distinct ${quoteIdent(companyCol)}::text)::int` : 'null::int'} as company_count
         from ${quoteTable(table)}
        where ${quoteIdent(docCol)}::text = any($1)
        group by ${quoteIdent(docCol)}`,
      [documentIds],
    );
    return res.rows.map((r) => ({ documentId: r.document_id, debit: Number(r.debit), credit: Number(r.credit), rowCount: Number(r.row_count), companyCount: r.company_count === null ? null : Number(r.company_count) }));
  }

  if (signedCol) {
    const res = await client.query(
      `select ${quoteIdent(docCol)}::text as document_id,
              coalesce(sum(${quoteIdent(signedCol)}::numeric),0)::text as signed,
              count(*)::int as row_count,
              ${companyCol ? `count(distinct ${quoteIdent(companyCol)}::text)::int` : 'null::int'} as company_count
         from ${quoteTable(table)}
        where ${quoteIdent(docCol)}::text = any($1)
        group by ${quoteIdent(docCol)}`,
      [documentIds],
    );
    return res.rows.map((r) => ({ documentId: r.document_id, signed: Number(r.signed), rowCount: Number(r.row_count), companyCount: r.company_count === null ? null : Number(r.company_count) }));
  }
  throw new SmokeFailure('Cannot verify GL balance: no debit/credit or signed amount columns found', { table });
}

async function verifyGlBalanced(client, tables, documentIds) {
  const sums = await glSumsByDocuments(client, tables, documentIds);
  const missingDocs = documentIds.filter((id) => !sums.some((r) => r.documentId === String(id)));
  if (missingDocs.length) throw new SmokeFailure('Some accounting documents have no GL entries', { missingDocs, documentIds, sums });
  const unbalanced = sums.filter((r) => {
    if (typeof r.signed === 'number') return Math.abs(r.signed) > MONEY_EPSILON;
    return Math.abs(r.debit - r.credit) > MONEY_EPSILON;
  });
  if (unbalanced.length) throw new SmokeFailure('GL entries are not balanced', { unbalanced, epsilon: MONEY_EPSILON, sums });
  const isolated = sums.filter((r) => r.companyCount !== null && r.companyCount !== 1);
  if (isolated.length) throw new SmokeFailure('company_id isolation failed for GL entries', { isolated });
  return { documentIds, sums };
}

async function verifyCompanyIsolationForNewRows(client, tables, companyId, tableKinds, afterDocumentIds = []) {
  const failures = [];
  const evidence = {};
  for (const kind of tableKinds) {
    const table = tables[kind];
    if (!table) continue;
    const columns = await columnsFor(client, table);
    const companyCol = resolveColumn(columns, 'companyId', { required: false, tableKind: kind });
    const docCol = resolveColumn(columns, 'accountingDocumentId', { required: false, tableKind: kind });
    const sourceCol = resolveColumn(columns, 'sourceDocumentId', { required: false, tableKind: kind });
    if (!companyCol) {
      failures.push({ kind, reason: 'company_id column not found; cannot verify isolation' });
      continue;
    }
    let where = `${quoteIdent(companyCol)}::text <> $1`;
    const values = [String(companyId)];
    if (afterDocumentIds.length && docCol) {
      where += ` and ${quoteIdent(docCol)}::text = any($2)`;
      values.push(afterDocumentIds);
    } else if (afterDocumentIds.length && sourceCol) {
      where += ` and ${quoteIdent(sourceCol)}::text = any($2)`;
      values.push(afterDocumentIds);
    }
    const bad = await countTable(client, table, `where ${where}`, values);
    evidence[kind] = { companyColumn: companyCol, checkedWithDocumentIds: Boolean(afterDocumentIds.length && (docCol || sourceCol)), badRows: bad };
    if (bad > 0) failures.push({ kind, badRows: bad, companyCol });
  }
  if (failures.length) throw new SmokeFailure('company_id isolation invariant failed or could not be verified', { failures, evidence });
  return evidence;
}

async function verifyVatLinkage(client, tables, ids) {
  const table = tables.vatLedger;
  const columns = await columnsFor(client, table);
  const docCol = resolveColumn(columns, 'accountingDocumentId', { required: false, tableKind: 'vatLedger' });
  const sourceCol = resolveColumn(columns, 'sourceDocumentId', { required: false, tableKind: 'vatLedger' });
  if (!docCol && !sourceCol) throw new SmokeFailure('VAT ledger linkage cannot be verified: no source/accounting document column', { table });
  const checks = [];
  if (docCol && ids.accountingDocumentIds.length) {
    checks.push({ column: docCol, ids: ids.accountingDocumentIds });
  }
  if (sourceCol && ids.sourceDocumentIds.length) {
    checks.push({ column: sourceCol, ids: ids.sourceDocumentIds });
  }
  if (!checks.length) throw new SmokeFailure('VAT ledger linkage cannot be verified: no returned IDs match VAT linkage columns', { ids, docCol, sourceCol });
  const evidence = [];
  for (const c of checks) {
    const count = await countTable(client, table, `where ${quoteIdent(c.column)}::text = any($1)`, [c.ids]);
    evidence.push({ column: c.column, ids: c.ids, count });
  }
  if (!evidence.some((e) => e.count > 0)) throw new SmokeFailure('No VAT ledger rows linked to smoke source/accounting documents', { evidence });
  return evidence;
}

async function verifyInventoryGlLinkage(client, tables, ids) {
  const invTable = tables.inventoryLedger;
  const invColumns = await columnsFor(client, invTable);
  const invDocCol = resolveColumn(invColumns, 'accountingDocumentId', { required: false, tableKind: 'inventoryLedger' });
  const invSourceCol = resolveColumn(invColumns, 'sourceDocumentId', { required: false, tableKind: 'inventoryLedger' });
  const invIdCol = resolveColumn(invColumns, 'id', { required: false, tableKind: 'inventoryLedger' });

  const evidence = { checked: [] };
  if (invDocCol && ids.accountingDocumentIds.length) {
    const count = await countTable(client, invTable, `where ${quoteIdent(invDocCol)}::text = any($1)`, [ids.accountingDocumentIds]);
    evidence.checked.push({ table: 'inventoryLedger', column: invDocCol, ids: ids.accountingDocumentIds, count });
    if (count > 0) return evidence;
  }
  if (invSourceCol && ids.sourceDocumentIds.length) {
    const count = await countTable(client, invTable, `where ${quoteIdent(invSourceCol)}::text = any($1)`, [ids.sourceDocumentIds]);
    evidence.checked.push({ table: 'inventoryLedger', column: invSourceCol, ids: ids.sourceDocumentIds, count });
    if (count > 0) return evidence;
  }

  const glColumns = await columnsFor(client, tables.glEntries);
  const glInvCol = resolveColumn(glColumns, 'inventoryLedgerId', { required: false, tableKind: 'glEntries' });
  if (glInvCol && invIdCol && ids.inventoryLedgerEntryIds?.length) {
    const count = await countTable(client, tables.glEntries, `where ${quoteIdent(glInvCol)}::text = any($1)`, [ids.inventoryLedgerEntryIds.map(String)]);
    evidence.checked.push({ table: 'glEntries', column: glInvCol, ids: ids.inventoryLedgerEntryIds, count });
    if (count > 0) return evidence;
  }
  throw new SmokeFailure('Inventory ledger ↔ GL linkage not verified', { evidence, ids, required: 'inventory ledger rows must link to accounting/source document or GL entries must link to inventory ledger entries' });
}

async function fetchRowsByDoc(client, table, tableKind, docIds) {
  const columns = await columnsFor(client, table);
  const docCol = resolveColumn(columns, 'accountingDocumentId', { required: false, tableKind });
  if (!docCol) throw new SmokeFailure(`Cannot fetch ${tableKind} by accounting document id`, { table });
  const idCol = resolveColumn(columns, 'id', { required: false, tableKind });
  const res = await client.query(`select * from ${quoteTable(table)} where ${quoteIdent(docCol)}::text = any($1) order by ${idCol ? quoteIdent(idCol) : quoteIdent(docCol)}`, [docIds.map(String)]);
  return res.rows;
}

function stableRows(rows) {
  return rows.map((row) => {
    const clone = { ...row };
    for (const key of Object.keys(clone)) {
      if (/updated_at|updatedAt|modified_at|modifiedAt/i.test(key)) delete clone[key];
    }
    return clone;
  });
}

async function verifyReversal(client, tables, originalResult, cancelResult) {
  const originalDocIds = documentIdsFrom(originalResult).filter((id) => !String(id).startsWith(String(cancelResult?.reversalAccountingDocumentId ?? '__none__')));
  if (!originalDocIds.length) throw new SmokeFailure('Cannot verify cancel/reversal: original accounting document ID missing', { originalResult });
  const reversalIds = documentIdsFrom(cancelResult);
  if (!reversalIds.length) throw new SmokeFailure('Cancel did not return a reversal accounting document ID', { cancelResult });

  const beforeOriginalRows = originalResult.__originalGlRowsBeforeCancel;
  const afterOriginalRows = await fetchRowsByDoc(client, tables.glEntries, 'glEntries', originalDocIds);
  if (beforeOriginalRows && JSON.stringify(stableRows(beforeOriginalRows)) !== JSON.stringify(stableRows(afterOriginalRows))) {
    throw new SmokeFailure('Cancel mutated original posted GL rows; expected append-only reversal', { originalDocIds, beforeOriginalRows, afterOriginalRows });
  }

  const originalSums = await glSumsByDocuments(client, tables, originalDocIds);
  const reversalSums = await glSumsByDocuments(client, tables, reversalIds);
  const reversalBalanced = reversalSums.filter((r) => (r.signed !== undefined ? Math.abs(r.signed) <= MONEY_EPSILON : Math.abs(r.debit - r.credit) <= MONEY_EPSILON));
  if (reversalBalanced.length !== reversalSums.length) throw new SmokeFailure('Reversal GL document is not balanced', { reversalSums });

  // If the adapter supplies reversalOfAccountingDocumentId, the runner verifies linkage strictly.
  if (cancelResult.reversalOfAccountingDocumentId && !originalDocIds.includes(String(cancelResult.reversalOfAccountingDocumentId))) {
    throw new SmokeFailure('Cancel result reversalOfAccountingDocumentId does not match original smoke document', { originalDocIds, cancelResult });
  }
  return { originalDocIds, reversalIds, originalRowsUnchanged: Boolean(beforeOriginalRows), originalSums, reversalSums };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }
  if (args.procedure) {
    console.log(procedureText());
    return 0;
  }

  const runId = process.env.INT01A_RUN_ID || `int01a-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;
  const reporter = new Reporter({ runId, reportDir: args.reportDir });
  let client;
  const runtime = { runId };

  try {
    await reporter.step('INT01A-00', 'Required environment is present and integration-only', async () => {
      ensureRequiredEnv();
      return { requiredEnv: REQUIRED_ENV, databaseUrlRedacted: redactDatabaseUrl(process.env.DATABASE_URL) };
    });

    await reporter.step('INT01A-01', 'Database connectivity uses real PostgreSQL', async () => {
      const PgClient = await loadPgClient();
      client = new PgClient({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      runtime.db = await validatePostgres(client);
      return runtime.db;
    });

    await reporter.step('INT01A-02', 'Migrations already applied / freeze-scope tables exist', async () => {
      const detected = await detectTables(client);
      runtime.tables = detected.tables;
      runtime.migrationInfo = detected.migrationInfo;
      return {
        migrationInfo: detected.migrationInfo,
        resolvedTables: Object.fromEntries(Object.entries(detected.tables).map(([k, t]) => [k, t ? `${t.schema}.${t.name}` : null])),
      };
    });

    await reporter.step('INT01A-03', 'MD-01 seed/preseed real master data exists', async () => {
      runtime.seed = await verifySeed(client, runtime.tables);
      return runtime.seed;
    });

    await reporter.step('INT01A-04', 'Approved module surface adapter/commands are bound', async () => {
      runtime.binding = await loadAdapter(args.adapter);
      runtime.ctx = buildSmokeContext({ runId, seed: runtime.seed, tables: runtime.tables });
      return { mode: runtime.binding.mode, adapterPath: args.adapter || null, commandMode: runtime.binding.mode === 'commands' };
    });

    runtime.before = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);

    await reporter.step('INT01A-05', 'Post Sales / Delivery baseline through approved surface', async () => {
      const before = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const result = requireResult(await runtime.binding.adapter.postSalesDelivery(runtime.ctx), 'postSalesDelivery', ['accountingDocumentId', 'accountingDocumentIds', 'salesInvoiceId', 'deliveryId', 'documentId']);
      result.__originalGlRowsBeforeCancel = await fetchRowsByDoc(client, runtime.tables.glEntries, 'glEntries', documentIdsFrom(result));
      runtime.sales = result;
      const after = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const deltas = await assertCountsIncreased(before, after, ['glEntries', 'salesInvoices', 'arLedger'], 'sales/delivery should post GL + sales invoice + AR');
      await verifyGlBalanced(client, runtime.tables, documentIdsFrom(result));
      return { result, deltas };
    });

    await reporter.step('INT01A-06', 'Post Purchase / GRNI baseline through approved surface', async () => {
      const before = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const result = requireResult(await runtime.binding.adapter.postPurchaseGrni(runtime.ctx), 'postPurchaseGrni', ['accountingDocumentId', 'accountingDocumentIds', 'purchaseReceiptId', 'purchaseInvoiceId', 'documentId']);
      runtime.purchase = result;
      const after = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const deltas = await assertCountsIncreased(before, after, ['glEntries', 'purchaseReceipts', 'purchaseInvoices', 'apLedger'], 'purchase/GRNI should post GL + receipt/invoice + AP');
      await verifyGlBalanced(client, runtime.tables, documentIdsFrom(result));
      return { result, deltas };
    });

    await reporter.step('INT01A-07', 'Post VAT ledger baseline / source linkage', async () => {
      const before = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      let explicitVatResult = null;
      if (typeof runtime.binding.adapter.postVatLedger === 'function' && process.env.INT01A_REQUIRE_EXPLICIT_VAT_STEP === '1') {
        explicitVatResult = requireResult(await runtime.binding.adapter.postVatLedger(runtime.ctx), 'postVatLedger', ['accountingDocumentId', 'accountingDocumentIds', 'sourceDocumentId', 'documentId']);
      }
      const after = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const combined = [runtime.sales, runtime.purchase, explicitVatResult].filter(Boolean);
      const ids = { accountingDocumentIds: documentIdsFrom(...combined), sourceDocumentIds: sourceIdsFrom(...combined) };
      const vatAfterSalesPurchase = after.vatLedger.count - runtime.before.vatLedger.count;
      if (vatAfterSalesPurchase <= 0) {
        throw new SmokeFailure('VAT ledger did not receive rows from sales/purchase baseline', { beforeInitial: runtime.before.vatLedger, beforeStep: before.vatLedger, afterStep: after.vatLedger, explicitVatResult });
      }
      const linkage = await verifyVatLinkage(client, runtime.tables, ids);
      return { explicitVatResult, vatDeltaSinceInitial: vatAfterSalesPurchase, linkage };
    });

    await reporter.step('INT01A-08', 'Post AR/AP settlement through approved surface', async () => {
      const before = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const result = requireResult(await runtime.binding.adapter.settleArAp({ ...runtime.ctx, sales: runtime.sales, purchase: runtime.purchase }), 'settleArAp', ['accountingDocumentId', 'accountingDocumentIds', 'settlementId', 'allocationId', 'documentId']);
      runtime.settlement = result;
      const after = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const kinds = runtime.tables.arapAllocations ? ['glEntries', 'arapAllocations'] : ['glEntries', 'arLedger', 'apLedger'];
      const deltas = await assertCountsIncreased(before, after, kinds, 'settlement should append GL and allocation/ledger rows');
      await verifyGlBalanced(client, runtime.tables, documentIdsFrom(result));
      return { result, deltas };
    });

    await reporter.step('INT01A-09', 'Post inventory movement / adjustment through approved surface', async () => {
      const before = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const result = requireResult(await runtime.binding.adapter.postInventoryAdjustment(runtime.ctx), 'postInventoryAdjustment', ['accountingDocumentId', 'accountingDocumentIds', 'inventoryLedgerEntryId', 'inventoryDocumentId', 'documentId']);
      runtime.inventory = result;
      const after = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const deltas = await assertCountsIncreased(before, after, ['glEntries', 'inventoryLedger'], 'inventory movement should append inventory ledger and GL rows');
      await assertCountsNotDecreased(before, after, ['stockBalances'], 'stock balances must not disappear after inventory movement');
      await verifyGlBalanced(client, runtime.tables, documentIdsFrom(result));
      const linkage = await verifyInventoryGlLinkage(client, runtime.tables, {
        accountingDocumentIds: documentIdsFrom(result),
        sourceDocumentIds: sourceIdsFrom(result),
        inventoryLedgerEntryIds: result.inventoryLedgerEntryIds || (result.inventoryLedgerEntryId ? [result.inventoryLedgerEntryId] : []),
      });
      return { result, deltas, linkage };
    });

    await reporter.step('INT01A-10', 'Query GL entries and verify Debit = Credit for all smoke documents', async () => {
      const ids = documentIdsFrom(runtime.sales, runtime.purchase, runtime.settlement, runtime.inventory);
      const gl = await verifyGlBalanced(client, runtime.tables, ids);
      return gl;
    });

    await reporter.step('INT01A-11', 'Verify company_id isolation for freeze-scope ledgers', async () => {
      const ids = documentIdsFrom(runtime.sales, runtime.purchase, runtime.settlement, runtime.inventory);
      const isolation = await verifyCompanyIsolationForNewRows(client, runtime.tables, process.env.MD01_COMPANY_ID, ['glEntries', 'vatLedger', 'arLedger', 'apLedger', 'inventoryLedger'], ids);
      return isolation;
    });

    await reporter.step('INT01A-12', 'Cancel one document and verify append-only reversal', async () => {
      const before = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const target = { type: 'sales', result: runtime.sales, accountingDocumentIds: documentIdsFrom(runtime.sales), sourceDocumentIds: sourceIdsFrom(runtime.sales) };
      const cancelResult = requireResult(await runtime.binding.adapter.cancelDocument({ ...runtime.ctx, target }), 'cancelDocument', ['reversalAccountingDocumentId', 'accountingDocumentId', 'accountingDocumentIds', 'reversalDocumentId', 'documentId']);
      runtime.cancel = cancelResult;
      const after = await snapshotCounts(client, runtime.tables, process.env.MD01_COMPANY_ID);
      const deltas = await assertCountsIncreased(before, after, ['glEntries'], 'cancel/reversal should append compensating GL entries');
      const reversal = await verifyReversal(client, runtime.tables, runtime.sales, cancelResult);
      await verifyGlBalanced(client, runtime.tables, documentIdsFrom(cancelResult));
      return { cancelResult, deltas, reversal };
    });

    const report = await reporter.write({ runtime: { db: runtime.db, migrationInfo: runtime.migrationInfo } });
    console.log(`[INT-01A] PASS. JSON: ${report.jsonPath}`);
    console.log(`[INT-01A] PASS. Markdown: ${report.mdPath}`);
    return 0;
  } catch (error) {
    const report = await reporter.write({ runtime: { db: runtime.db ?? null, migrationInfo: runtime.migrationInfo ?? null }, terminalError: normalizeError(error) });
    console.error(`[INT-01A] FAIL. JSON: ${report.jsonPath}`);
    console.error(`[INT-01A] FAIL. Markdown: ${report.mdPath}`);
    console.error(`[INT-01A] ${error?.message ?? error}`);
    return error?.details?.exitCode === 2 ? 2 : 1;
  } finally {
    if (client) {
      try { await client.end(); } catch { /* ignore */ }
    }
  }
}

function toMarkdown(payload) {
  const lines = [];
  lines.push(`# INT-01A Smoke Test Result`);
  lines.push('');
  lines.push(`- Runner: ${payload.runner}`);
  lines.push(`- Run ID: ${payload.runId}`);
  lines.push(`- Status: **${payload.status}**`);
  lines.push(`- Started: ${payload.startedAt}`);
  lines.push(`- Ended: ${payload.endedAt}`);
  lines.push(`- NODE_ENV: ${payload.environment.nodeEnv}`);
  lines.push(`- DATABASE_URL: ${payload.environment.databaseUrlRedacted}`);
  lines.push('');
  lines.push(`## Step Summary`);
  lines.push('');
  lines.push('| Step | Status | Duration ms | Title |');
  lines.push('|---|---:|---:|---|');
  for (const step of payload.steps) {
    lines.push(`| ${escapeMd(step.id)} | ${step.status} | ${step.durationMs ?? ''} | ${escapeMd(step.title)} |`);
  }
  lines.push('');
  lines.push('## Failures / Open Issues');
  lines.push('');
  if (!payload.openIssues.length) {
    lines.push('None.');
  } else {
    for (const issue of payload.openIssues) {
      lines.push(`### ${escapeMd(issue.step)} — ${escapeMd(issue.title)}`);
      lines.push('');
      lines.push(`- Error: ${escapeMd(issue.error?.message ?? 'unknown')}`);
      if (issue.error?.details) {
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(issue.error.details, null, 2));
        lines.push('```');
      }
      lines.push('');
    }
  }
  lines.push('## Full Evidence');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(payload, null, 2));
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function escapeMd(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

const exitCode = await main();
process.exit(exitCode);
