#!/usr/bin/env node
/*
 * MD-01 Master Data Baseline Seeder
 * Scope: customers, suppliers, items, warehouses only.
 * No business logic, no UI, no CRM/procurement/warehouse-advanced/pricing/planning.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REQUIRED_ENV = [
  'DATABASE_URL',
  'MD01_COMPANY_ID',
  'MD01_INVENTORY_ACCOUNT_ID',
  'MD01_COGS_ACCOUNT_ID',
  'MD01_REVENUE_ACCOUNT_ID',
  'MD01_EXPENSE_ACCOUNT_ID',
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadSeed() {
  const seedPath = path.join(__dirname, '..', 'seed_data', 'master_data_baseline.seed.json');
  return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
}

async function tableHasColumn(client, tableName, columnName) {
  const { rows } = await client.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
        AND column_name = $2
      LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function requireCompany(client, companyId) {
  const { rows } = await client.query('SELECT id FROM companies WHERE id = $1 LIMIT 1', [companyId]);
  if (rows.length !== 1) {
    throw new Error(`Company not found: ${companyId}`);
  }
}

async function requireAccount(client, accountId, companyId, label) {
  const hasCompanyId = await tableHasColumn(client, 'accounts', 'company_id');
  const sql = hasCompanyId
    ? 'SELECT id FROM accounts WHERE id = $1 AND company_id = $2 LIMIT 1'
    : 'SELECT id FROM accounts WHERE id = $1 LIMIT 1';
  const params = hasCompanyId ? [accountId, companyId] : [accountId];
  const { rows } = await client.query(sql, params);
  if (rows.length !== 1) {
    const scope = hasCompanyId ? ` for company ${companyId}` : '';
    throw new Error(`${label} account not found${scope}: ${accountId}`);
  }
}

async function upsertCustomer(client, companyId, row) {
  await client.query(
    `INSERT INTO customers (id, company_id, code, name, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id, code)
     DO UPDATE SET
       name = EXCLUDED.name,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [row.id, companyId, row.code, row.name, row.is_active]
  );
}

async function upsertSupplier(client, companyId, row) {
  await client.query(
    `INSERT INTO suppliers (id, company_id, code, name, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id, code)
     DO UPDATE SET
       name = EXCLUDED.name,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [row.id, companyId, row.code, row.name, row.is_active]
  );
}

async function upsertWarehouse(client, companyId, row) {
  await client.query(
    `INSERT INTO warehouses (id, company_id, code, name, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id, code)
     DO UPDATE SET
       name = EXCLUDED.name,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [row.id, companyId, row.code, row.name, row.is_active]
  );
}

async function upsertItem(client, companyId, row, accountIds) {
  await client.query(
    `INSERT INTO items (
       id, company_id, code, name, item_type, is_stock_item,
       inventory_account_id, cogs_account_id, revenue_account_id, expense_account_id,
       is_active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (company_id, code)
     DO UPDATE SET
       name = EXCLUDED.name,
       item_type = EXCLUDED.item_type,
       is_stock_item = EXCLUDED.is_stock_item,
       inventory_account_id = EXCLUDED.inventory_account_id,
       cogs_account_id = EXCLUDED.cogs_account_id,
       revenue_account_id = EXCLUDED.revenue_account_id,
       expense_account_id = EXCLUDED.expense_account_id,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [
      row.id,
      companyId,
      row.code,
      row.name,
      row.item_type,
      row.is_stock_item,
      accountIds.inventory,
      accountIds.cogs,
      accountIds.revenue,
      accountIds.expense,
      row.is_active,
    ]
  );
}

async function main() {
  for (const name of REQUIRED_ENV) requireEnv(name);

  const seed = loadSeed();
  const companyId = requireEnv('MD01_COMPANY_ID');
  const accountIds = {
    inventory: requireEnv('MD01_INVENTORY_ACCOUNT_ID'),
    cogs: requireEnv('MD01_COGS_ACCOUNT_ID'),
    revenue: requireEnv('MD01_REVENUE_ACCOUNT_ID'),
    expense: requireEnv('MD01_EXPENSE_ACCOUNT_ID'),
  };

  const client = new Client({ connectionString: requireEnv('DATABASE_URL') });
  await client.connect();

  try {
    await client.query('BEGIN');
    await requireCompany(client, companyId);
    await requireAccount(client, accountIds.inventory, companyId, 'inventory');
    await requireAccount(client, accountIds.cogs, companyId, 'cogs');
    await requireAccount(client, accountIds.revenue, companyId, 'revenue');
    await requireAccount(client, accountIds.expense, companyId, 'expense');

    for (const row of seed.records.customers) await upsertCustomer(client, companyId, row);
    for (const row of seed.records.suppliers) await upsertSupplier(client, companyId, row);
    for (const row of seed.records.warehouses) await upsertWarehouse(client, companyId, row);
    for (const row of seed.records.items) await upsertItem(client, companyId, row, accountIds);

    await client.query('COMMIT');
    console.log(JSON.stringify({ ok: true, package: seed.package, company_id: companyId }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
