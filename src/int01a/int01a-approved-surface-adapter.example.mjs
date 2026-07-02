/**
 * INT-01A approved-surface adapter example.
 *
 * Copy this file inside the assembled candidate tree and replace each throw with calls to
 * existing approved module APIs/services/commands. Do NOT add business logic here.
 *
 * The runner imports the adapter via:
 *   INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs
 *
 * Each function must return JSON identifiers for documents created by the approved modules.
 */

export async function createInt01aAdapter() {
  return {
    async postSalesDelivery(ctx) {
      // Example only:
      // const result = await existingSalesService.postSalesInvoiceAndDelivery({ ...ctx });
      // return {
      //   salesInvoiceId: result.invoiceId,
      //   deliveryId: result.deliveryId,
      //   accountingDocumentId: result.accountingDocumentId,
      // };
      throw new Error('INT-01A adapter not bound: postSalesDelivery must call an existing approved Sales/Delivery surface.');
    },

    async postPurchaseGrni(ctx) {
      throw new Error('INT-01A adapter not bound: postPurchaseGrni must call an existing approved Purchase/GRNI surface.');
    },

    // Optional unless INT01A_REQUIRE_EXPLICIT_VAT_STEP=1. VAT is normally verified from Sales/Purchase output.
    async postVatLedger(ctx) {
      throw new Error('INT-01A adapter not bound: postVatLedger must call an existing approved VAT surface, or leave unused.');
    },

    async settleArAp(ctx) {
      throw new Error('INT-01A adapter not bound: settleArAp must call existing approved AR/AP allocation/settlement surface.');
    },

    async postInventoryAdjustment(ctx) {
      throw new Error('INT-01A adapter not bound: postInventoryAdjustment must call existing approved Inventory movement/adjustment surface.');
    },

    async cancelDocument(ctx) {
      throw new Error('INT-01A adapter not bound: cancelDocument must call existing approved cancel/reversal surface.');
    },
  };
}
