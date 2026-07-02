/*
 * INT-01C wrapper for local INT01A smoke.
 *
 * Set:
 *   export INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter-int01c.mjs
 *
 * This wrapper preserves the required INT-01A adapter exports while adding one
 * targeted precondition before postSalesDelivery. The precondition calls the
 * existing approved adapter surface: postInventoryAdjustment first, or
 * postPurchaseGrni if EW-05 is unavailable.
 */

import * as approvedAdapter from './int01a-approved-surface-adapter.mjs';
import { ensureSalesStockPrecondition } from './int01a-sales-stock-precondition-bridge.mjs';

const requiredExports = [
  'postSalesDelivery',
  'postPurchaseGrni',
  'settleArAp',
  'postInventoryAdjustment',
  'cancelDocument',
];

for (const exportName of requiredExports) {
  if (typeof approvedAdapter[exportName] !== 'function') {
    throw new Error(`INT-01C adapter wrapper fail-closed: base adapter missing required export ${exportName}`);
  }
}

export async function postSalesDelivery(input) {
  await ensureSalesStockPrecondition(approvedAdapter, input);
  return approvedAdapter.postSalesDelivery(input);
}

export const postPurchaseGrni = approvedAdapter.postPurchaseGrni;
export const settleArAp = approvedAdapter.settleArAp;
export const postInventoryAdjustment = approvedAdapter.postInventoryAdjustment;
export const cancelDocument = approvedAdapter.cancelDocument;

export const __int01cAdapterWrapper = Object.freeze({
  wraps: './int01a-approved-surface-adapter.mjs',
  stockPrecondition: './int01a-sales-stock-precondition-bridge.mjs',
  localSmokeOnly: true,
  productionMergeAllowed: false,
});
