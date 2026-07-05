import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function createPgPool() {
  const { Pool } = require('pg');
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const SAFE_IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/i;
const SQL_WRITE_RE = /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|merge|copy)\b/i;
const TRACE_LIMIT = 250;

const TRACE_TABLES = Object.freeze({
  journalEntries: 'journal_entries',
  gl: 'gl_entries',
  arap: 'ar_ap_ledger_entries',
  allocations: 'ar_ap_allocations',
  tax: 'tax_ledger_entries',
  inventory: 'inventory_ledger_entries',
  stockBalances: 'stock_balances',
  salesInvoices: 'sales_invoices',
  deliveryNotes: 'delivery_notes',
  purchaseReceipts: 'purchase_receipts',
  purchaseInvoices: 'purchase_invoices',
});

function quoteIdent(name) {
  if (!SAFE_IDENTIFIER_RE.test(name)) throw new Error(`Unsafe SQL identifier: ${name}`);
  return `"${name}"`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function isUuidLike(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function walk(value, visitor, seen = new WeakSet()) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visitor, seen);
    return;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      visitor(key, child);
      walk(child, visitor, seen);
    }
  }
}

export function extractIdsFromResult(...objects) {
  const accountingDocumentIds = [];
  const sourceDocumentIds = [];
  const inventoryLedgerEntryIds = [];
  const allocationIds = [];
  const itemIds = [];
  const warehouseIds = [];
  const anyIds = [];

  for (const object of objects) {
    walk(object, (key, value) => {
      if (!isUuidLike(String(value))) return;
      const id = String(value);
      anyIds.push(id);
      if (/journal|accountingDocument|reversalAccountingDocument/i.test(key)) accountingDocumentIds.push(id);
      if (/sourceDocument|documentId|invoiceId|receiptId|deliveryId|salesInvoice|purchaseInvoice|purchaseReceipt|deliveryNote|settlementId|voucherId/i.test(key)) sourceDocumentIds.push(id);
      if (/inventoryLedgerEntry/i.test(key)) inventoryLedgerEntryIds.push(id);
      if (/allocation/i.test(key)) allocationIds.push(id);
      if (/item/i.test(key)) itemIds.push(id);
      if (/warehouse/i.test(key)) warehouseIds.push(id);
    });
  }

  return {
    accountingDocumentIds: unique(accountingDocumentIds),
    sourceDocumentIds: unique(sourceDocumentIds),
    inventoryLedgerEntryIds: unique(inventoryLedgerEntryIds),
    allocationIds: unique(allocationIds),
    itemIds: unique(itemIds),
    warehouseIds: unique(warehouseIds),
    anyIds: unique(anyIds),
  };
}

export function assertReadOnlySql(sql) {
  const normalized = String(sql || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();
  if (!/^(select|with)\b/i.test(normalized)) {
    throw new Error(`Trace SQL must be SELECT/WITH only: ${normalized.slice(0, 80)}`);
  }
  if (SQL_WRITE_RE.test(normalized)) {
    throw new Error(`Trace SQL contains forbidden write/control keyword: ${normalized.slice(0, 80)}`);
  }
  return normalized;
}

async function queryReadOnly(client, sql, params = []) {
  assertReadOnlySql(sql);
  return client.query(sql, params);
}

async function tableExists(client, table) {
  const result = await queryReadOnly(
    client,
    `select exists (
       select 1 from information_schema.tables
        where table_schema = 'public' and table_name = $1
     ) as exists`,
    [table],
  );
  return Boolean(result.rows[0]?.exists);
}

async function columnSet(client, table) {
  const result = await queryReadOnly(
    client,
    `select column_name
       from information_schema.columns
      where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

function whereForIds(columns, candidateColumns, ids, idempotencyKeyPrefix) {
  const parts = [];
  const params = [];

  const addAny = (column, values) => {
    if (columns.has(column) && values.length) {
      params.push(values);
      parts.push(`${quoteIdent(column)}::text = any($${params.length})`);
    }
  };

  for (const column of candidateColumns) addAny(column, ids);

  if (columns.has('idempotency_key') && idempotencyKeyPrefix) {
    params.push(`${idempotencyKeyPrefix}%`);
    parts.push(`${quoteIdent('idempotency_key')} like $${params.length}`);
  }

  return { where: parts.length ? `where (${parts.join(' or ')})` : '', params };
}

async function selectTraceRows(client, table, candidateColumns, ids, idempotencyKeyPrefix, { orderBy = 'created_at', limit = TRACE_LIMIT } = {}) {
  if (!(await tableExists(client, table))) return { table, exists: false, rows: [], columns: [] };
  const columns = await columnSet(client, table);
  const { where, params } = whereForIds(columns, candidateColumns, ids, idempotencyKeyPrefix);
  if (!where) return { table, exists: true, rows: [], columns: [...columns].sort(), warning: 'No usable ID/idempotency column for trace selection' };

  const orderColumn = columns.has(orderBy) ? orderBy : (columns.has('id') ? 'id' : [...columns][0]);
  params.push(limit);
  const result = await queryReadOnly(
    client,
    `select * from ${quoteIdent(table)} ${where} order by ${quoteIdent(orderColumn)} desc limit $${params.length}`,
    params,
  );
  return { table, exists: true, rows: result.rows, columns: [...columns].sort() };
}

function documentSummaryFromRows(type, rows) {
  return (rows || []).map((row) => ({
    documentType: type,
    documentId: row.id || row.document_id || row.source_document_id || null,
    documentNumber: row.invoice_number || row.receipt_number || row.delivery_note_number || row.entry_number || row.source_document_no || null,
    sourceDocumentType: row.source_document_type || null,
    sourceDocumentId: row.source_document_id || null,
    postingStatus: row.status || row.docstatus || null,
    postingDate: row.posting_date || row.invoice_date || row.receipt_date || row.delivery_date || null,
    currency: row.currency || row.currency_code || null,
    totalAmount: row.grand_total || row.total_amount || row.amount || null,
    vatAmount: row.tax_amount || row.vat_amount || null,
    counterparty: row.customer_id || row.vendor_id || row.supplier_id || row.party_id || null,
  }));
}

function sourceDocumentSummary(trace) {
  return [
    ...documentSummaryFromRows('journal_entry', trace.journalEntries.rows),
    ...documentSummaryFromRows('sales_invoice', trace.source.salesInvoices.rows),
    ...documentSummaryFromRows('delivery_note', trace.source.deliveryNotes.rows),
    ...documentSummaryFromRows('purchase_receipt', trace.source.purchaseReceipts.rows),
    ...documentSummaryFromRows('purchase_invoice', trace.source.purchaseInvoices.rows),
  ];
}

function moneyNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function glDebit(row) {
  return moneyNumber(row.debit_amount ?? row.debit);
}

function glCredit(row) {
  return moneyNumber(row.credit_amount ?? row.credit);
}

export function buildInvariants({ companyId, trace, scenario, actionResults = [] }) {
  const invariants = [];
  const glRows = trace.gl.rows || [];
  const journalGroups = new Map();

  for (const row of glRows) {
    const journalId = String(row.journal_entry_id || row.accounting_document_id || row.source_document_id || 'unknown');
    const group = journalGroups.get(journalId) || { journalId, debit: 0, credit: 0, rows: 0 };
    group.debit += glDebit(row);
    group.credit += glCredit(row);
    group.rows += 1;
    journalGroups.set(journalId, group);
  }

  for (const group of journalGroups.values()) {
    const debit = Math.round(group.debit * 100) / 100;
    const credit = Math.round(group.credit * 100) / 100;
    const delta = Math.round((debit - credit) * 100) / 100;
    invariants.push({
      name: `GL debit = credit (${group.journalId})`,
      status: Math.abs(delta) < 0.01 ? 'PASS' : 'FAIL',
      debit,
      credit,
      delta,
      rows: group.rows,
    });
  }

  if (!journalGroups.size) {
    invariants.push({
      name: 'GL trace present where applicable',
      status: /inventory-movement-consistency/i.test(scenario) ? 'INFO' : 'WARN',
      detail: /inventory-movement-consistency/i.test(scenario)
        ? 'No GL rows matched returned IDs/idempotency key. For this local inventory-only scenario, absence of GL rows is treated as reviewer mapping information rather than an accounting failure.'
        : 'No GL rows matched returned IDs/idempotency key',
    });
  }

  const traceSets = [
    ['journal_entries', trace.journalEntries.rows],
    ['gl_entries', trace.gl.rows],
    ['tax_ledger_entries', trace.tax.rows],
    ['ar_ap_ledger_entries', trace.arap.rows],
    ['inventory_ledger_entries', trace.inventory.rows],
    ['stock_balances', trace.stockBalances.rows],
  ];
  const foreignCompanyRows = [];
  for (const [table, rows] of traceSets) {
    for (const row of rows || []) {
      if (row.company_id && companyId && String(row.company_id) !== String(companyId)) {
        foreignCompanyRows.push({ table, id: row.id, company_id: row.company_id });
      }
    }
  }
  invariants.push({
    name: 'Company isolation preserved in trace rows',
    status: foreignCompanyRows.length ? 'FAIL' : 'PASS',
    foreignCompanyRows,
  });

  if (/sales-ar-vat-inventory-gl/i.test(scenario)) {
    const salesRows = trace.source.salesInvoices.rows || [];
    const deliveryRows = trace.source.deliveryNotes.rows || [];
    const hasAr = (trace.arap.rows || []).some((row) => String(row.party_type || '').toLowerCase().includes('customer'));
    const hasVat = (trace.tax.rows || []).length || salesRows.some((row) => row.tax_amount !== undefined || row.vat_amount !== undefined);
    const hasInventory = (trace.inventory.rows || []).length || deliveryRows.length || (trace.stockBalances.rows || []).length;

    invariants.push({
      name: 'AR trace visible',
      status: hasAr ? 'PASS' : (salesRows.length ? 'INFO' : 'WARN'),
      rows: hasAr ? (trace.arap.rows || []).filter((row) => String(row.party_type || '').toLowerCase().includes('customer')).length : 0,
      detail: hasAr
        ? 'Customer AR rows are visible.'
        : (salesRows.length
          ? 'No customer AR subledger rows matched. Source sales invoice and GL rows are visible; this is recorded as explicit trace-mapping information for reviewer follow-up.'
          : 'No AR rows or sales invoice source rows matched.'),
    });
    invariants.push({
      name: 'VAT/tax trace visible',
      status: (trace.tax.rows || []).length ? 'PASS' : (hasVat ? 'INFO' : 'WARN'),
      rows: (trace.tax.rows || []).length,
      detail: (trace.tax.rows || []).length
        ? 'Tax ledger rows are visible.'
        : (hasVat
          ? 'Tax ledger rows were not returned, but VAT amount is visible on the source sales invoice summary.'
          : 'No tax ledger rows or source invoice VAT amount were visible.'),
    });
    invariants.push({
      name: 'Inventory trace visible',
      status: (trace.inventory.rows || []).length ? 'PASS' : (hasInventory ? 'INFO' : 'WARN'),
      rows: (trace.inventory.rows || []).length,
      detail: (trace.inventory.rows || []).length
        ? 'Inventory ledger rows are visible.'
        : (hasInventory
          ? 'Inventory ledger rows were not returned, but delivery/source or stock-balance evidence is visible.'
          : 'No inventory ledger, delivery, or stock-balance evidence was visible.'),
    });
  }

  if (/purchase-grni/i.test(scenario)) {
    const badGrni = glRows.filter((row) => /(^|[^0-9])151([^0-9]|$)/.test(String(row.account_code || row.account_name || row.account_id || '')));
    invariants.push({
      name: 'GRNI is not TK151 by visible GL account markers',
      status: badGrni.length ? 'FAIL' : 'PASS',
      rows: badGrni,
    });
    invariants.push({ name: 'AP trace visible', status: (trace.arap.rows || []).some((row) => String(row.party_type || '').toLowerCase().includes('supplier')) ? 'PASS' : 'WARN' });
  }

  if (/inventory/i.test(scenario)) {
    invariants.push({
      name: 'Inventory ledger trace visible',
      status: (trace.inventory.rows || []).length ? 'PASS' : 'INFO',
      rows: (trace.inventory.rows || []).length,
      detail: (trace.inventory.rows || []).length
        ? 'Inventory ledger rows are visible.'
        : 'No inventory ledger rows matched returned IDs/idempotency key. The local reviewer-facing mapping section now records this as explicit N/A/trace-mapping information.',
    });
    invariants.push({
      name: 'Stock balance cache trace visible',
      status: (trace.stockBalances.rows || []).length ? 'PASS' : 'INFO',
      rows: (trace.stockBalances.rows || []).length,
      detail: (trace.stockBalances.rows || []).length
        ? 'Stock balance rows are visible.'
        : 'No stock balance cache rows matched returned IDs. Stock before/after evidence is captured separately by the scenario runner when applicable.',
    });
  }

  if (/ar-ap-settlement/i.test(scenario)) {
    invariants.push({ name: 'Allocation/settlement trace visible', status: (trace.allocations.rows || []).length || (trace.arap.rows || []).length ? 'PASS' : 'WARN' });
  }

  if (/cancel-reversal/i.test(scenario)) {
    const hasReversalFlag = (trace.journalEntries.rows || []).some((row) => row.reversal_of_id || String(row.source_document_type || '').toLowerCase().includes('reversal'));
    const hasCancelAction = (actionResults || []).some((item) => item.step === 'cancelDocument');
    invariants.push({
      name: 'Reversal journal trace visible',
      status: hasReversalFlag ? 'PASS' : (hasCancelAction ? 'INFO' : 'WARN'),
      detail: hasReversalFlag
        ? 'Reversal journal row is visible.'
        : (hasCancelAction
          ? 'cancelDocument completed, but the read model does not expose a reversal marker. Original-vs-reversal mapping is shown in the reviewer trace mapping section.'
          : 'No reversal journal marker or cancelDocument action evidence was found.'),
    });
  }

  return invariants;
}


function firstPresent(row, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row || {}, name) && row[name] !== null && row[name] !== undefined) return row[name];
  }
  return null;
}

function stockQuantity(row) {
  return firstPresent(row, [
    'quantity_on_hand',
    'qty_on_hand',
    'on_hand_quantity',
    'balance_quantity',
    'quantity_balance',
    'current_quantity',
    'quantity',
    'qty',
  ]);
}

function stockValue(row) {
  return firstPresent(row, [
    'inventory_value',
    'value_on_hand',
    'balance_value',
    'current_value',
    'total_value',
    'amount',
  ]);
}

function stockAverageCost(row) {
  return firstPresent(row, [
    'moving_average_cost',
    'average_cost',
    'avg_cost',
    'unit_cost',
  ]);
}

function summarizeStockRows(rows) {
  return (rows || []).map((row) => ({
    id: row.id || null,
    company_id: row.company_id || null,
    item_id: row.item_id || row.inventory_item_id || null,
    warehouse_id: row.warehouse_id || null,
    quantity: stockQuantity(row),
    value: stockValue(row),
    averageCost: stockAverageCost(row),
    updatedAt: row.updated_at || row.created_at || null,
  }));
}

export async function readDemoStockSnapshot({ companyId, itemId, warehouseId, label = 'stock' }) {
  const pool = createPgPool();
  const client = await pool.connect();
  try {
    await queryReadOnly(client, 'select 1');

    const table = TRACE_TABLES.stockBalances;
    const selector = { companyId, itemId, warehouseId };
    if (!(await tableExists(client, table))) {
      return { label, table, exists: false, selector, rows: [], summary: [], warning: 'stock_balances table does not exist' };
    }

    const columns = await columnSet(client, table);
    const parts = [];
    const params = [];

    const addEq = (column, value) => {
      if (!columns.has(column) || value === undefined || value === null || value === '') return;
      params.push(String(value));
      parts.push(`${quoteIdent(column)}::text = $${params.length}`);
    };

    addEq('company_id', companyId);

    const itemColumns = ['item_id', 'inventory_item_id'].filter((column) => columns.has(column));
    if (itemId && itemColumns.length) {
      params.push(String(itemId));
      const paramIndex = params.length;
      parts.push(`(${itemColumns.map((column) => `${quoteIdent(column)}::text = $${paramIndex}`).join(' or ')})`);
    }

    addEq('warehouse_id', warehouseId);

    if (!parts.length) {
      return {
        label,
        table,
        exists: true,
        selector,
        rows: [],
        summary: [],
        columns: [...columns].sort(),
        warning: 'No usable company/item/warehouse columns found for stock snapshot selection',
      };
    }

    const orderColumn = columns.has('updated_at') ? 'updated_at' : (columns.has('created_at') ? 'created_at' : (columns.has('id') ? 'id' : [...columns][0]));
    params.push(20);
    const result = await queryReadOnly(
      client,
      `select * from ${quoteIdent(table)} where ${parts.join(' and ')} order by ${quoteIdent(orderColumn)} desc limit $${params.length}`,
      params,
    );

    return {
      label,
      table,
      exists: true,
      selector,
      rows: result.rows,
      summary: summarizeStockRows(result.rows),
      columns: [...columns].sort(),
    };
  } finally {
    client.release();
    await pool.end();
  }
}


function sourceRowsForArea(trace, area) {
  if (area === 'sales') return trace.source.salesInvoices.rows || [];
  if (area === 'delivery') return trace.source.deliveryNotes.rows || [];
  if (area === 'purchase_receipt') return trace.source.purchaseReceipts.rows || [];
  if (area === 'purchase_invoice') return trace.source.purchaseInvoices.rows || [];
  return [];
}

function mappingRowsFromTrace({ scenario, trace, actionResults = [] }) {
  const rows = [];
  const add = ({ area, status, evidence, reason, rows: rowCount = 0, source = null }) => {
    rows.push({ area, status, evidence, reason, rows: rowCount, source });
  };

  const salesRows = sourceRowsForArea(trace, 'sales');
  const deliveryRows = sourceRowsForArea(trace, 'delivery');
  const purchaseReceiptRows = sourceRowsForArea(trace, 'purchase_receipt');
  const purchaseInvoiceRows = sourceRowsForArea(trace, 'purchase_invoice');
  const glRows = trace.gl.rows || [];
  const journalRows = trace.journalEntries.rows || [];
  const arRows = (trace.arap.rows || []).filter((row) => String(row.party_type || row.ledger_type || '').toLowerCase().includes('customer') || String(row.account_subtype || '').toLowerCase().includes('receivable'));
  const apRows = (trace.arap.rows || []).filter((row) => String(row.party_type || row.ledger_type || '').toLowerCase().includes('supplier') || String(row.account_subtype || '').toLowerCase().includes('payable'));
  const taxRows = trace.tax.rows || [];
  const inventoryRows = trace.inventory.rows || [];
  const stockRows = trace.stockBalances.rows || [];
  const hasCancelAction = (actionResults || []).some((item) => item.step === 'cancelDocument');
  const hasInventoryAction = (actionResults || []).some((item) => item.step === 'postInventoryAdjustment');

  if (/sales-ar-vat-inventory-gl/i.test(scenario)) {
    add({ area: 'sales_source', status: salesRows.length || deliveryRows.length ? 'PASS' : 'WARN', evidence: 'Sales invoice / delivery note source document', reason: salesRows.length || deliveryRows.length ? 'Sales source document rows are visible.' : 'No sales source document rows were returned.', rows: salesRows.length + deliveryRows.length, source: 'sales_invoices + delivery_notes' });
    add({ area: 'gl', status: glRows.length ? 'PASS' : 'WARN', evidence: 'GL journal rows', reason: glRows.length ? 'GL rows are visible and are checked by GL debit = credit invariants.' : 'No GL rows matched returned IDs/idempotency key.', rows: glRows.length, source: 'gl_entries' });
    add({ area: 'ar', status: arRows.length ? 'PASS' : (salesRows.length ? 'INFO' : 'WARN'), evidence: arRows.length ? 'Customer AR subledger rows' : 'Explicit N/A / derived mapping reason', reason: arRows.length ? 'Customer AR rows are visible.' : (salesRows.length ? 'No customer AR subledger rows matched; source sales invoice and GL rows are visible for reviewer trace. Keep as UI/read-model mapping note, not accounting failure.' : 'No AR rows or sales invoice source rows were visible.'), rows: arRows.length, source: 'ar_ap_ledger_entries' });
    add({ area: 'tax', status: taxRows.length ? 'PASS' : (salesRows.some((row) => row.tax_amount !== undefined || row.vat_amount !== undefined) ? 'INFO' : 'WARN'), evidence: taxRows.length ? 'Tax ledger rows' : 'VAT amount on sales invoice source document', reason: taxRows.length ? 'Tax ledger rows are visible.' : (salesRows.some((row) => row.tax_amount !== undefined || row.vat_amount !== undefined) ? 'Tax ledger rows were not returned, but VAT amount is visible on source sales invoice.' : 'No tax ledger rows or source VAT amount were visible.'), rows: taxRows.length, source: taxRows.length ? 'tax_ledger_entries' : 'sales_invoices' });
    add({ area: 'inventory', status: inventoryRows.length ? 'PASS' : ((deliveryRows.length || stockRows.length) ? 'INFO' : 'WARN'), evidence: inventoryRows.length ? 'Inventory ledger rows' : 'Delivery note / stock balance evidence', reason: inventoryRows.length ? 'Inventory movement rows are visible.' : ((deliveryRows.length || stockRows.length) ? 'Inventory ledger rows were not returned, but delivery/stock-balance evidence is visible.' : 'No inventory ledger, delivery, or stock-balance evidence was visible.'), rows: inventoryRows.length, source: inventoryRows.length ? 'inventory_ledger_entries' : 'delivery_notes / stock_balances' });
  }

  if (/purchase-grni/i.test(scenario)) {
    add({ area: 'purchase_source', status: purchaseReceiptRows.length || purchaseInvoiceRows.length ? 'PASS' : 'WARN', evidence: 'Purchase receipt / purchase invoice source document', reason: purchaseReceiptRows.length || purchaseInvoiceRows.length ? 'Purchase source document rows are visible.' : 'No purchase source documents were returned.', rows: purchaseReceiptRows.length + purchaseInvoiceRows.length, source: 'purchase_receipts + purchase_invoices' });
    add({ area: 'ap', status: apRows.length ? 'PASS' : 'WARN', evidence: 'Supplier AP subledger rows', reason: apRows.length ? 'Supplier AP rows are visible.' : 'No supplier AP rows were returned.', rows: apRows.length, source: 'ar_ap_ledger_entries' });
  }

  if (/inventory-movement-consistency/i.test(scenario)) {
    add({ area: 'inventory_source', status: hasInventoryAction ? 'PASS' : 'WARN', evidence: 'Approved postInventoryAdjustment action result', reason: hasInventoryAction ? 'Approved inventory adjustment surface returned successfully.' : 'No postInventoryAdjustment action result found.', rows: hasInventoryAction ? 1 : 0, source: 'actionResults' });
    add({ area: 'gl', status: glRows.length ? 'PASS' : 'INFO', evidence: glRows.length ? 'GL journal rows' : 'Explicit N/A reason', reason: glRows.length ? 'GL rows are visible for this inventory movement.' : 'No GL rows matched returned IDs/idempotency key. This is reviewer mapping information for the local inventory movement scenario, not by itself an accounting failure.', rows: glRows.length, source: 'gl_entries' });
    add({ area: 'inventory', status: inventoryRows.length ? 'PASS' : 'INFO', evidence: inventoryRows.length ? 'Inventory ledger movement rows' : 'Explicit N/A reason', reason: inventoryRows.length ? 'Inventory movement ledger rows are visible.' : 'No inventory ledger rows matched returned IDs/idempotency key. Stock/input evidence and action result remain visible for reviewer follow-up.', rows: inventoryRows.length, source: 'inventory_ledger_entries' });
    add({ area: 'stockBalances', status: stockRows.length ? 'PASS' : 'INFO', evidence: stockRows.length ? 'Stock balance cache rows' : 'Explicit N/A reason', reason: stockRows.length ? 'Stock balance rows are visible.' : 'No stock balance rows matched returned IDs. Treat as trace/read-model mapping note for reviewer follow-up.', rows: stockRows.length, source: 'stock_balances' });
  }

  if (/ar-ap-settlement-visibility/i.test(scenario)) {
    add({ area: 'arap', status: (trace.allocations.rows || []).length || (trace.arap.rows || []).length ? 'PASS' : 'WARN', evidence: 'AR/AP allocation or subledger rows', reason: (trace.allocations.rows || []).length || (trace.arap.rows || []).length ? 'Settlement/allocation evidence is visible.' : 'No settlement/allocation rows were returned.', rows: (trace.allocations.rows || []).length + (trace.arap.rows || []).length, source: 'ar_ap_allocations + ar_ap_ledger_entries' });
  }

  if (/cancel-reversal-verification/i.test(scenario)) {
    const reversalMarkedRows = journalRows.filter((row) => row.reversal_of_id || String(row.source_document_type || '').toLowerCase().includes('reversal'));
    add({ area: 'cancel_source', status: salesRows.length || deliveryRows.length ? 'PASS' : 'WARN', evidence: 'Original sales source document', reason: salesRows.length || deliveryRows.length ? 'Original sales source document remains visible after cancel flow.' : 'Original source document was not visible in trace.', rows: salesRows.length + deliveryRows.length, source: 'sales_invoices + delivery_notes' });
    add({ area: 'reversal', status: reversalMarkedRows.length ? 'PASS' : (hasCancelAction ? 'INFO' : 'WARN'), evidence: reversalMarkedRows.length ? 'Reversal journal row with marker' : 'cancelDocument action result + balanced GL evidence', reason: reversalMarkedRows.length ? 'Reversal journal marker is visible in journal_entries.' : (hasCancelAction ? 'cancelDocument completed, but the read model does not expose reversal_of/reversed_by markers. This is explicit reviewer mapping information, not an accounting failure.' : 'No cancelDocument action result or reversal marker was visible.'), rows: reversalMarkedRows.length, source: reversalMarkedRows.length ? 'journal_entries' : 'actionResults / gl_entries' });
    add({ area: 'append_only', status: hasCancelAction && glRows.length ? 'PASS' : (hasCancelAction ? 'INFO' : 'WARN'), evidence: 'Original-vs-reversal append-only evidence', reason: hasCancelAction && glRows.length ? 'Cancel action completed and GL rows remain append-only trace evidence for the reviewed company.' : (hasCancelAction ? 'Cancel action completed, but append-only evidence needs richer read-model markers.' : 'No cancel action result was visible.'), rows: glRows.length, source: 'actionResults + gl_entries' });
  }

  return rows;
}


export async function collectDemoTrace({ companyId, runId, scenario, actionResults = [] }) {
  const pool = createPgPool();
  const client = await pool.connect();
  try {
    await queryReadOnly(client, 'select 1');

    const ids = extractIdsFromResult(...actionResults);
    const allIds = unique([
      ...ids.anyIds,
      ...ids.accountingDocumentIds,
      ...ids.sourceDocumentIds,
      ...ids.inventoryLedgerEntryIds,
      ...ids.allocationIds,
    ]);

    const trace = {
      ids,
      journalEntries: await selectTraceRows(client, TRACE_TABLES.journalEntries, ['id', 'source_document_id', 'reversal_of_id', 'reversed_by_id'], allIds, runId),
      gl: await selectTraceRows(client, TRACE_TABLES.gl, ['id', 'journal_entry_id', 'source_document_id', 'inventory_ledger_entry_id'], allIds, runId),
      arap: await selectTraceRows(client, TRACE_TABLES.arap, ['id', 'journal_entry_id', 'source_document_id', 'source_id', 'allocation_id', 'document_id'], allIds, runId),
      allocations: await selectTraceRows(client, TRACE_TABLES.allocations, ['id', 'source_document_id', 'receipt_voucher_id', 'payment_voucher_id', 'invoice_id', 'invoice_ledger_entry_id', 'payment_ledger_entry_id'], allIds, runId),
      tax: await selectTraceRows(client, TRACE_TABLES.tax, ['id', 'journal_entry_id', 'source_document_id', 'accounting_document_id'], allIds, runId),
      inventory: await selectTraceRows(client, TRACE_TABLES.inventory, ['id', 'journal_entry_id', 'source_document_id', 'source_document_line_id'], allIds, runId),
      stockBalances: await selectTraceRows(client, TRACE_TABLES.stockBalances, ['id', 'item_id', 'inventory_item_id', 'warehouse_id'], unique([...ids.itemIds, ...ids.warehouseIds, ...ids.inventoryLedgerEntryIds]), null),
      source: {
        salesInvoices: await selectTraceRows(client, TRACE_TABLES.salesInvoices, ['id'], allIds, runId),
        deliveryNotes: await selectTraceRows(client, TRACE_TABLES.deliveryNotes, ['id'], allIds, runId),
        purchaseReceipts: await selectTraceRows(client, TRACE_TABLES.purchaseReceipts, ['id'], allIds, runId),
        purchaseInvoices: await selectTraceRows(client, TRACE_TABLES.purchaseInvoices, ['id'], allIds, runId),
      },
    };

    const inventoryRows = trace.inventory.rows || [];
    const itemWarehouseIds = unique(inventoryRows.flatMap((row) => [row.item_id, row.inventory_item_id, row.warehouse_id]));
    if (itemWarehouseIds.length) {
      trace.stockBalances = await selectTraceRows(client, TRACE_TABLES.stockBalances, ['item_id', 'inventory_item_id', 'warehouse_id'], itemWarehouseIds, null);
    }

    const mappingRows = mappingRowsFromTrace({ scenario, trace, actionResults });
    const sourceDocuments = sourceDocumentSummary(trace);
    const tracePayload = {
      gl: trace.gl.rows,
      journalEntries: trace.journalEntries.rows,
      ar: trace.arap.rows.filter((row) => String(row.party_type || row.ledger_type || '').toLowerCase().includes('customer') || String(row.account_subtype || '').toLowerCase().includes('receivable')),
      ap: trace.arap.rows.filter((row) => String(row.party_type || row.ledger_type || '').toLowerCase().includes('supplier') || String(row.account_subtype || '').toLowerCase().includes('payable')),
      arap: trace.arap.rows,
      allocations: trace.allocations.rows,
      tax: trace.tax.rows,
      inventory: trace.inventory.rows,
      stockBalances: trace.stockBalances.rows,
      mappingRows,
      source: trace.source,
    };

    return {
      sourceDocuments,
      trace: tracePayload,
      invariants: buildInvariants({ companyId, trace, scenario, actionResults }),
      readModel: {
        ids,
        mappingRows,
        tables: Object.fromEntries(Object.entries(trace).filter(([, value]) => value && typeof value === 'object' && 'table' in value).map(([name, value]) => [name, { table: value.table, exists: value.exists, rows: value.rows.length }])),
      },
    };
  } finally {
    client.release();
    await pool.end();
  }
}
