/**
 * INT-01B P0 v1.1 — Functional INT-01A approved-surface adapter.
 *
 * This adapter is intentionally thin.  It maps the INT-01A smoke-runner call into
 * a DB-backed Sales/Delivery bridge and keeps all Sales/Delivery posting logic in
 * the approved EW-03 SalesPostingService surface plus its injected module
 * dependencies.
 */

import { createPostSalesDeliveryBridge } from './int01b-post-sales-delivery-wiring.mjs';

class Int01bPendingSurfaceError extends Error {
  constructor(surface, details = {}) {
    super(`[INT01B] Approved module surface not wired in v1.1 patch scope: ${surface}`);
    this.name = 'Int01bPendingSurfaceError';
    this.surface = surface;
    this.details = details;
  }
}

export function createInt01aAdapter(adapterContext = {}) {
  const salesDeliveryBridge = createPostSalesDeliveryBridge(adapterContext);

  return {
    /**
     * INT01A-05 — implemented in this patch.
     */
    async postSalesDelivery(ctx = {}) {
      return salesDeliveryBridge.postSalesDelivery(ctx);
    },

    /**
     * Other INT-01A module surfaces remain fail-closed unless separately supplied
     * by the local candidate/runtime. This prevents fake-pass behavior while still
     * allowing INT01A-04 adapter shape validation to succeed.
     */
    async postPurchaseGrni(ctx = {}) {
      if (typeof adapterContext.postPurchaseGrni === 'function') return adapterContext.postPurchaseGrni(ctx);
      throw new Int01bPendingSurfaceError('postPurchaseGrni', { nextBlocker: 'INT01A_PURCHASE_GRNI_WIRING_REQUIRED' });
    },

    async settleArAp(ctx = {}) {
      if (typeof adapterContext.settleArAp === 'function') return adapterContext.settleArAp(ctx);
      throw new Int01bPendingSurfaceError('settleArAp', { nextBlocker: 'INT01A_AR_AP_SETTLEMENT_WIRING_REQUIRED' });
    },

    async postInventoryAdjustment(ctx = {}) {
      if (typeof adapterContext.postInventoryAdjustment === 'function') return adapterContext.postInventoryAdjustment(ctx);
      throw new Int01bPendingSurfaceError('postInventoryAdjustment', { nextBlocker: 'INT01A_INVENTORY_ADJUSTMENT_WIRING_REQUIRED' });
    },

    async cancelDocument(ctx = {}) {
      if (typeof adapterContext.cancelDocument === 'function') return adapterContext.cancelDocument(ctx);
      throw new Int01bPendingSurfaceError('cancelDocument', { nextBlocker: 'INT01A_CANCEL_REVERSAL_WIRING_REQUIRED' });
    },
  };
}

const defaultAdapter = createInt01aAdapter();

export const postSalesDelivery = defaultAdapter.postSalesDelivery;
export const postPurchaseGrni = defaultAdapter.postPurchaseGrni;
export const settleArAp = defaultAdapter.settleArAp;
export const postInventoryAdjustment = defaultAdapter.postInventoryAdjustment;
export const cancelDocument = defaultAdapter.cancelDocument;

export default defaultAdapter;
