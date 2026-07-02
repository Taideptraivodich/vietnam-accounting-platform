/*
 * INT-01C local smoke stock precondition bridge.
 *
 * Purpose:
 *   Ensure INT01A Sales/Delivery smoke has positive stock before posting.
 *
 * Scope guard:
 *   This bridge is intended only for local INT01A integration smoke. It does not
 *   perform SQL writes and must be invoked through an approved module surface:
 *   1) preferred: EW-05 inventory adjustment/opening stock surface
 *   2) fallback:  EW-04 purchase GRNI/stock-in surface
 *
 * Forbidden by design:
 *   - no negative-stock override
 */

const DEFAULT_MIN_QUANTITY = 10;
const DEFAULT_UNIT_COST = 100;
const preconditionKeysApplied = new Set();

function env(name, fallback = undefined) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function numberFrom(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function collectLineQuantity(line) {
  return numberFrom(
    getFirst(
      line?.quantity,
      line?.qty,
      line?.issueQuantity,
      line?.deliveryQuantity,
      line?.quantityBase,
      line?.baseQuantity,
      line?.quantity_base,
      line?.qty_base
    ),
    0
  );
}

function extractLines(input = {}) {
  return getFirst(
    input.lines,
    input.deliveryLines,
    input.delivery_lines,
    input.salesLines,
    input.sales_lines,
    input.items,
    input.document?.lines,
    input.document?.deliveryLines,
    []
  );
}

function salesQuantity(input = {}) {
  const explicit = numberFrom(
    getFirst(
      process.env.INT01C_STOCK_PRECONDITION_QUANTITY,
      input.quantity,
      input.qty,
      input.issueQuantity,
      input.deliveryQuantity,
      input.quantityBase,
      input.baseQuantity
    ),
    undefined
  );

  if (explicit !== undefined) return Math.max(explicit, DEFAULT_MIN_QUANTITY);

  const lines = extractLines(input);
  if (Array.isArray(lines) && lines.length > 0) {
    const total = lines.reduce((sum, line) => sum + collectLineQuantity(line), 0);
    if (total > 0) return Math.max(total, DEFAULT_MIN_QUANTITY);
  }

  return DEFAULT_MIN_QUANTITY;
}

function extractContext(input = {}) {
  const firstLine = Array.isArray(extractLines(input)) ? extractLines(input)[0] ?? {} : {};

  const companyId = getFirst(
    env('MD01_COMPANY_ID'),
    env('COMPANY_ID'),
    input.companyId,
    input.company_id,
    input.company?.id,
    input.document?.companyId,
    input.document?.company_id,
    firstLine.companyId,
    firstLine.company_id
  );

  const itemId = getFirst(
    env('MD01_ITEM_ID'),
    env('MD01_INVENTORY_ITEM_ID'),
    env('INT01A_ITEM_ID'),
    input.itemId,
    input.item_id,
    input.inventoryItemId,
    input.inventory_item_id,
    input.document?.itemId,
    input.document?.item_id,
    firstLine.itemId,
    firstLine.item_id,
    firstLine.inventoryItemId,
    firstLine.inventory_item_id
  );

  const warehouseId = getFirst(
    env('MD01_WAREHOUSE_ID'),
    env('INT01A_WAREHOUSE_ID'),
    input.warehouseId,
    input.warehouse_id,
    input.document?.warehouseId,
    input.document?.warehouse_id,
    firstLine.warehouseId,
    firstLine.warehouse_id
  );

  const inventoryAccountId = getFirst(
    env('MD01_INVENTORY_ACCOUNT_ID'),
    env('INT01A_INVENTORY_ACCOUNT_ID'),
    input.inventoryAccountId,
    input.inventory_account_id,
    input.accounts?.inventoryAccountId,
    input.accounts?.inventory_account_id,
    firstLine.inventoryAccountId,
    firstLine.inventory_account_id
  );

  const offsetAccountId = getFirst(
    env('MD01_OPENING_STOCK_OFFSET_ACCOUNT_ID'),
    env('MD01_STOCK_ADJUSTMENT_OFFSET_ACCOUNT_ID'),
    env('MD01_COGS_ACCOUNT_ID'),
    env('INT01A_STOCK_OFFSET_ACCOUNT_ID'),
    input.offsetAccountId,
    input.offset_account_id,
    input.openingStockOffsetAccountId,
    input.opening_stock_offset_account_id,
    input.accounts?.offsetAccountId,
    input.accounts?.offset_account_id,
    input.accounts?.cogsAccountId,
    input.accounts?.cogs_account_id
  );

  const vendorId = getFirst(
    env('MD01_VENDOR_ID'),
    env('INT01A_VENDOR_ID'),
    input.vendorId,
    input.vendor_id,
    input.supplierId,
    input.supplier_id
  );

  return { companyId, itemId, warehouseId, inventoryAccountId, offsetAccountId, vendorId };
}

function missingContextNames(context, surfaceName) {
  const required = ['companyId', 'itemId', 'warehouseId', 'inventoryAccountId'];
  if (surfaceName === 'EW-05') required.push('offsetAccountId');
  return required.filter((name) => !context[name]);
}

function buildInventoryAdjustmentPayload(input = {}, context) {
  const quantity = salesQuantity(input);
  const unitCost = numberFrom(env('INT01C_STOCK_PRECONDITION_UNIT_COST'), DEFAULT_UNIT_COST);
  const override = env('INT01C_INVENTORY_ADJUSTMENT_PAYLOAD_JSON');

  if (override) {
    const payload = JSON.parse(override);
    return { ...payload, __int01cApprovedSurface: 'EW-05 inventory adjustment/opening stock' };
  }

  return {
    source: 'INT-01C_LOCAL_SMOKE_STOCK_PRECONDITION',
    sourceDocumentType: 'INT01C_OPENING_STOCK_PRECONDITION',
    reference: env('INT01C_STOCK_PRECONDITION_REFERENCE', `INT01C-STOCK-PRE-${Date.now()}`),
    companyId: context.companyId,
    company_id: context.companyId,
    postingDate: env('INT01C_STOCK_PRECONDITION_POSTING_DATE', new Date().toISOString().slice(0, 10)),
    mode: 'OPENING_STOCK',
    reasonCode: 'INT01C_LOCAL_SMOKE_PRECONDITION',
    lines: [
      {
        itemId: context.itemId,
        item_id: context.itemId,
        warehouseId: context.warehouseId,
        warehouse_id: context.warehouseId,
        quantity,
        qty: quantity,
        unitCost,
        unit_cost: unitCost,
        inventoryAccountId: context.inventoryAccountId,
        inventory_account_id: context.inventoryAccountId,
        offsetAccountId: context.offsetAccountId,
        offset_account_id: context.offsetAccountId,
      },
    ],
    metadata: {
      int01c: true,
      localSmokeOnly: true,
      purpose: 'positive stock precondition before INT01A-05 Sales/Delivery',
      protectedTableWrites: 'forbidden',
    },
    __int01cApprovedSurface: 'EW-05 inventory adjustment/opening stock',
  };
}

function buildPurchaseGrniPayload(input = {}, context) {
  const quantity = salesQuantity(input);
  const unitCost = numberFrom(env('INT01C_STOCK_PRECONDITION_UNIT_COST'), DEFAULT_UNIT_COST);
  const override = env('INT01C_PURCHASE_GRNI_PAYLOAD_JSON');

  if (override) {
    const payload = JSON.parse(override);
    return { ...payload, __int01cApprovedSurface: 'EW-04 purchase GRNI/receipt stock-in' };
  }

  return {
    source: 'INT-01C_LOCAL_SMOKE_STOCK_PRECONDITION',
    sourceDocumentType: 'INT01C_PURCHASE_GRNI_STOCK_PRECONDITION',
    reference: env('INT01C_STOCK_PRECONDITION_REFERENCE', `INT01C-GRNI-PRE-${Date.now()}`),
    companyId: context.companyId,
    company_id: context.companyId,
    vendorId: context.vendorId,
    vendor_id: context.vendorId,
    postingDate: env('INT01C_STOCK_PRECONDITION_POSTING_DATE', new Date().toISOString().slice(0, 10)),
    lines: [
      {
        itemId: context.itemId,
        item_id: context.itemId,
        warehouseId: context.warehouseId,
        warehouse_id: context.warehouseId,
        quantity,
        qty: quantity,
        unitCost,
        unit_cost: unitCost,
        inventoryAccountId: context.inventoryAccountId,
        inventory_account_id: context.inventoryAccountId,
      },
    ],
    metadata: {
      int01c: true,
      localSmokeOnly: true,
      purpose: 'positive stock precondition before INT01A-05 Sales/Delivery',
      protectedTableWrites: 'forbidden',
    },
    __int01cApprovedSurface: 'EW-04 purchase GRNI/receipt stock-in',
  };
}

function shouldSkip() {
  const flag = String(env('INT01C_STOCK_PRECONDITION_ENABLED', '1')).toLowerCase();
  return flag === '0' || flag === 'false' || flag === 'no' || flag === 'skip';
}

function stablePreconditionKey(context) {
  return [context.companyId, context.itemId, context.warehouseId].join('::');
}

/**
 * Establish positive stock through an approved freeze-scope surface.
 *
 * @param {object} approvedSurfaces the current INT-01A adapter module exports
 * @param {object} salesDeliveryInput input that will be passed to postSalesDelivery
 * @param {object} options optional controls
 * @returns {Promise<object>} stock-precondition execution summary
 */
export async function ensureSalesStockPrecondition(approvedSurfaces, salesDeliveryInput = {}, options = {}) {
  if (shouldSkip()) {
    throw new Error('INT-01C stock precondition is disabled; local gate must not bypass stock setup.');
  }

  const context = extractContext(salesDeliveryInput);
  const key = stablePreconditionKey(context);
  if (!options.force && preconditionKeysApplied.has(key)) {
    return { skipped: true, reason: 'already-applied-in-process', key, context };
  }

  const preferred = String(env('INT01C_STOCK_PRECONDITION_SURFACE', 'EW-05')).toUpperCase();
  const canUseInventoryAdjustment = typeof approvedSurfaces?.postInventoryAdjustment === 'function';
  const canUsePurchaseGrni = typeof approvedSurfaces?.postPurchaseGrni === 'function';

  let surface;
  let payload;
  let handler;

  if (preferred !== 'EW-04' && canUseInventoryAdjustment) {
    const missing = missingContextNames(context, 'EW-05');
    if (missing.length > 0) {
      throw new Error(`INT-01C EW-05 stock precondition missing required context: ${missing.join(', ')}`);
    }
    surface = 'EW-05 inventory adjustment/opening stock';
    payload = buildInventoryAdjustmentPayload(salesDeliveryInput, context);
    handler = approvedSurfaces.postInventoryAdjustment;
  } else if (canUsePurchaseGrni) {
    const missing = missingContextNames(context, 'EW-04');
    if (missing.length > 0) {
      throw new Error(`INT-01C EW-04 stock precondition missing required context: ${missing.join(', ')}`);
    }
    surface = 'EW-04 purchase GRNI/receipt stock-in';
    payload = buildPurchaseGrniPayload(salesDeliveryInput, context);
    handler = approvedSurfaces.postPurchaseGrni;
  } else {
    throw new Error('INT-01C stock precondition cannot run: no approved postInventoryAdjustment or postPurchaseGrni surface is exported.');
  }

  console.log(`[INT-01C] Creating Sales/Delivery stock precondition through approved surface: ${surface}`);
  const result = await handler(payload);
  preconditionKeysApplied.add(key);
  console.log(`[INT-01C] Stock precondition completed before INT01A-05 for company=${context.companyId} item=${context.itemId} warehouse=${context.warehouseId}`);

  return {
    surface,
    context,
    quantity: salesQuantity(salesDeliveryInput),
    result,
  };
}

export const __int01cStockPreconditionBridge = Object.freeze({
  purpose: 'local INT01A smoke stock precondition',
  preferredSurface: 'EW-05 inventory adjustment/opening stock',
  fallbackSurface: 'EW-04 purchase GRNI/receipt stock-in',
  directProtectedTableWrites: false,
});
