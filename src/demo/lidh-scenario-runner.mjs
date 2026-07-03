import { randomUUID } from 'node:crypto';
import { LOCAL_DEMO_BANNER, assertLocalInteractiveDemoEnabled } from './lidh-env-gate.mjs';
import { loadApprovedDemoAdapter } from './lidh-adapter.mjs';
import { collectDemoTrace, extractIdsFromResult } from './lidh-trace-readers.mjs';

export const DEMO_SCENARIOS = Object.freeze([
  {
    slug: 'sales-ar-vat-inventory-gl',
    title: 'Sales → AR/VAT/Inventory/GL trace',
    action: 'postSalesDelivery',
    description: 'Runs the approved Sales/Delivery posting surface and traces source documents, AR, VAT, inventory, and GL.',
  },
  {
    slug: 'purchase-grni',
    title: 'Purchase / GRNI trace',
    action: 'postPurchaseGrni',
    description: 'Runs the approved Purchase Receipt + Purchase Invoice / GRNI surface and traces AP, VAT input, inventory, and GL.',
  },
  {
    slug: 'inventory-movement-consistency',
    title: 'Inventory movement consistency',
    action: 'postInventoryAdjustment',
    description: 'Runs the approved inventory movement/adjustment surface and shows inventory ledger, stock balance cache, and GL trace.',
  },
  {
    slug: 'ar-ap-settlement-visibility',
    title: 'AR/AP settlement visibility',
    action: 'settleArAp',
    description: 'Creates controlled sales and purchase support documents, then runs the approved AR/AP settlement/allocation surface.',
  },
  {
    slug: 'cancel-reversal-verification',
    title: 'Cancel / reversal verification',
    action: 'cancelDocument',
    description: 'Creates a controlled posted sales document and cancels it through the approved reversal path.',
  },
]);

function envFirst(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}


const LOCAL_DEMO_DEFAULTS = Object.freeze({
  customer_id: '00000000-0000-4000-8000-000000000101',
  supplier_id: '00000000-0000-4000-8000-000000000201',
  vendor_id: '00000000-0000-4000-8000-000000000201',
  warehouse_id: '00000000-0000-4000-8000-000000000301',
  item_id: '00000000-0000-4000-8000-000000000401',
});

function localDemoDefault(name) {
  return LOCAL_DEMO_DEFAULTS[name];
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function money(value, fallback) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : fallback;
}

function number(value, fallback) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function getScenario(slug) {
  return DEMO_SCENARIOS.find((scenario) => scenario.slug === slug);
}

export function buildDemoContext({ companyId, scenarioSlug, runId, body = {} }) {
  const postingDate = body.postingDate || body.posting_date || envFirst('LIDH_POSTING_DATE', 'INT01A_POSTING_DATE') || todayIsoDate();
  const idempotencyKey = runId;
  const masterData = {
    company_id: companyId || body.company_id || body.companyId || envFirst('MD01_COMPANY_ID'),
    customer_id: body.customer_id || body.customerId || envFirst('MD01_CUSTOMER_ID', 'INT01A_CUSTOMER_ID', 'LIDH_CUSTOMER_ID') || localDemoDefault('customer_id'),
    vendor_id: body.vendor_id || body.vendorId || body.supplier_id || body.supplierId || envFirst('MD01_VENDOR_ID', 'MD01_SUPPLIER_ID', 'INT01A_VENDOR_ID', 'INT01A_SUPPLIER_ID', 'LIDH_VENDOR_ID', 'LIDH_SUPPLIER_ID') || localDemoDefault('vendor_id'),
    supplier_id: body.supplier_id || body.supplierId || body.vendor_id || body.vendorId || envFirst('MD01_SUPPLIER_ID', 'MD01_VENDOR_ID', 'INT01A_SUPPLIER_ID', 'INT01A_VENDOR_ID', 'LIDH_SUPPLIER_ID', 'LIDH_VENDOR_ID') || localDemoDefault('supplier_id'),
    item_id: body.item_id || body.itemId || envFirst('MD01_ITEM_ID', 'MD01_INVENTORY_ITEM_ID', 'INT01A_ITEM_ID', 'LIDH_ITEM_ID') || localDemoDefault('item_id'),
    warehouse_id: body.warehouse_id || body.warehouseId || envFirst('MD01_WAREHOUSE_ID', 'INT01A_WAREHOUSE_ID', 'LIDH_WAREHOUSE_ID') || localDemoDefault('warehouse_id'),
    inventory_account_id: body.inventory_account_id || body.inventoryAccountId || envFirst('MD01_INVENTORY_ACCOUNT_ID'),
    cogs_account_id: body.cogs_account_id || body.cogsAccountId || envFirst('MD01_COGS_ACCOUNT_ID'),
    revenue_account_id: body.revenue_account_id || body.revenueAccountId || envFirst('MD01_REVENUE_ACCOUNT_ID'),
    expense_account_id: body.expense_account_id || body.expenseAccountId || envFirst('MD01_EXPENSE_ACCOUNT_ID'),
    grni_account_id: body.grni_account_id || body.grniAccountId || envFirst('MD01_GRNI_ACCOUNT_ID'),
    vat_output_account_id: body.vat_output_account_id || body.vatOutputAccountId || envFirst('MD01_VAT_OUTPUT_ACCOUNT_ID', 'MD01_OUTPUT_VAT_ACCOUNT_ID'),
    vat_input_account_id: body.vat_input_account_id || body.vatInputAccountId || envFirst('MD01_VAT_INPUT_ACCOUNT_ID', 'MD01_INPUT_VAT_ACCOUNT_ID'),
    cash_account_id: body.cash_account_id || body.cashAccountId || envFirst('MD01_CASH_ACCOUNT_ID'),
    bank_account_id: body.bank_account_id || body.bankAccountId || envFirst('MD01_BANK_ACCOUNT_ID'),
  };

  const ctx = {
    mode: 'local-demo',
    confirmLocalOnly: true,
    productionMergeAllowed: false,
    productionReleaseAllowed: false,
    uatOpened: false,
    p1p2Opened: false,
    scenarioSlug,
    runId,
    databaseUrl: process.env.DATABASE_URL,
    companyId: masterData.company_id,
    company_id: masterData.company_id,
    postingDate,
    posting_date: postingDate,
    idempotencyKey,
    idempotency_key: idempotencyKey,
    customerId: masterData.customer_id,
    customer_id: masterData.customer_id,
    vendorId: masterData.vendor_id,
    vendor_id: masterData.vendor_id,
    supplierId: masterData.supplier_id,
    supplier_id: masterData.supplier_id,
    itemId: masterData.item_id,
    item_id: masterData.item_id,
    warehouseId: masterData.warehouse_id,
    warehouse_id: masterData.warehouse_id,
    inventoryAccountId: masterData.inventory_account_id,
    inventory_account_id: masterData.inventory_account_id,
    cogsAccountId: masterData.cogs_account_id,
    cogs_account_id: masterData.cogs_account_id,
    revenueAccountId: masterData.revenue_account_id,
    revenue_account_id: masterData.revenue_account_id,
    expenseAccountId: masterData.expense_account_id,
    expense_account_id: masterData.expense_account_id,
    grniAccountId: masterData.grni_account_id,
    grni_account_id: masterData.grni_account_id,
    vatOutputAccountId: masterData.vat_output_account_id,
    vat_output_account_id: masterData.vat_output_account_id,
    vatInputAccountId: masterData.vat_input_account_id,
    vat_input_account_id: masterData.vat_input_account_id,
    cashAccountId: masterData.cash_account_id,
    cash_account_id: masterData.cash_account_id,
    bankAccountId: masterData.bank_account_id,
    bank_account_id: masterData.bank_account_id,
    quantity: number(body.quantity ?? envFirst('LIDH_QUANTITY', 'INT01A_SALES_QUANTITY'), 2),
    unitPrice: money(body.unitPrice ?? body.unit_price ?? envFirst('LIDH_UNIT_PRICE', 'INT01A_SALES_UNIT_PRICE'), 500),
    unit_price: money(body.unit_price ?? body.unitPrice ?? envFirst('LIDH_UNIT_PRICE', 'INT01A_SALES_UNIT_PRICE'), 500),
    taxRate: number(body.taxRate ?? body.tax_rate ?? envFirst('LIDH_TAX_RATE', 'INT01A_SALES_TAX_RATE'), 0.1),
    tax_rate: number(body.tax_rate ?? body.taxRate ?? envFirst('LIDH_TAX_RATE', 'INT01A_SALES_TAX_RATE'), 0.1),
    currency: body.currency || envFirst('LIDH_CURRENCY', 'INT01A_CURRENCY') || 'VND',
    masterData,
  };

  return ctx;
}

function requireCompanyId(ctx) {
  if (!ctx.companyId && !ctx.company_id) {
    throw new Error('companyId is required. Provide it in the URL or set MD01_COMPANY_ID from the local disposable seed/preseed env.');
  }
}

function normalizeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    details: error?.details || undefined,
    stack: process.env.LIDH_INCLUDE_STACK === '1' ? error?.stack : undefined,
  };
}

async function callSurface(adapter, surfaceName, payload) {
  if (typeof adapter[surfaceName] !== 'function') throw new Error(`Approved surface not available: ${surfaceName}`);
  return adapter[surfaceName](payload);
}

function targetFromPostedResult(type, result) {
  const ids = extractIdsFromResult(result);
  return {
    type,
    result,
    accountingDocumentIds: ids.accountingDocumentIds,
    sourceDocumentIds: ids.sourceDocumentIds,
  };
}

export async function runLocalDemoScenario({ scenarioSlug, companyId, body = {} }) {
  const gate = assertLocalInteractiveDemoEnabled();
  const scenario = getScenario(scenarioSlug);
  if (!scenario) {
    const error = new Error(`Unknown demo scenario: ${scenarioSlug}`);
    error.statusCode = 404;
    throw error;
  }

  const runId = `lidh-${scenario.slug}-${Date.now()}-${randomUUID()}`;
  const ctx = buildDemoContext({ companyId, scenarioSlug: scenario.slug, runId, body });
  requireCompanyId(ctx);

  const startedAt = new Date().toISOString();
  const warnings = [...gate.warnings, LOCAL_DEMO_BANNER];
  const actionResults = [];

  try {
    const { adapter, specifier } = await loadApprovedDemoAdapter();
    warnings.push(`Approved adapter: ${specifier}`);

    if (scenario.slug === 'sales-ar-vat-inventory-gl') {
      actionResults.push({ step: 'postSalesDelivery', result: await callSurface(adapter, 'postSalesDelivery', ctx) });
    } else if (scenario.slug === 'purchase-grni') {
      actionResults.push({ step: 'postPurchaseGrni', result: await callSurface(adapter, 'postPurchaseGrni', ctx) });
    } else if (scenario.slug === 'inventory-movement-consistency') {
      actionResults.push({ step: 'postInventoryAdjustment', result: await callSurface(adapter, 'postInventoryAdjustment', ctx) });
    } else if (scenario.slug === 'ar-ap-settlement-visibility') {
      const sales = await callSurface(adapter, 'postSalesDelivery', { ...ctx, idempotencyKey: `${runId}:sales`, idempotency_key: `${runId}:sales` });
      const purchase = await callSurface(adapter, 'postPurchaseGrni', { ...ctx, idempotencyKey: `${runId}:purchase`, idempotency_key: `${runId}:purchase` });
      const settlement = await callSurface(adapter, 'settleArAp', { ...ctx, sales, purchase, idempotencyKey: `${runId}:settlement`, idempotency_key: `${runId}:settlement` });
      actionResults.push({ step: 'postSalesDelivery', result: sales }, { step: 'postPurchaseGrni', result: purchase }, { step: 'settleArAp', result: settlement });
    } else if (scenario.slug === 'cancel-reversal-verification') {
      const sales = await callSurface(adapter, 'postSalesDelivery', { ...ctx, idempotencyKey: `${runId}:sales`, idempotency_key: `${runId}:sales` });
      const target = targetFromPostedResult('sales', sales);
      const reversal = await callSurface(adapter, 'cancelDocument', { ...ctx, target, idempotencyKey: `${runId}:cancel`, idempotency_key: `${runId}:cancel` });
      actionResults.push({ step: 'postSalesDelivery', result: sales }, { step: 'cancelDocument', result: reversal });
    }

    const trace = await collectDemoTrace({ companyId: ctx.companyId, runId, scenario: scenario.slug, actionResults });
    const failedInvariants = trace.invariants.filter((item) => item.status === 'FAIL');
    const status = failedInvariants.length ? 'FAIL' : 'PASS';

    return {
      status,
      scenario: scenario.slug,
      title: scenario.title,
      runId,
      companyId: ctx.companyId,
      startedAt,
      endedAt: new Date().toISOString(),
      banner: LOCAL_DEMO_BANNER,
      sourceDocuments: trace.sourceDocuments,
      actionResults,
      trace: trace.trace,
      invariants: trace.invariants,
      readModel: trace.readModel,
      warnings,
    };
  } catch (error) {
    return {
      status: 'FAIL',
      scenario: scenario.slug,
      title: scenario.title,
      runId,
      companyId: ctx.companyId,
      startedAt,
      endedAt: new Date().toISOString(),
      banner: LOCAL_DEMO_BANNER,
      sourceDocuments: [],
      actionResults,
      trace: { gl: [], journalEntries: [], ar: [], ap: [], arap: [], allocations: [], tax: [], inventory: [], stockBalances: [], source: {} },
      invariants: [{ name: 'Scenario action completed', status: 'FAIL', error: normalizeError(error) }],
      warnings,
      error: normalizeError(error),
    };
  }
}
