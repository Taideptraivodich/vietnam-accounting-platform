# INT01B Surface Binding Map

## postSalesDelivery

Calls existing Sales/Delivery approved surfaces, in this order:

```text
src/sales/services/SalesPostingService.js
src/sales/services/SalesInvoiceService.js
src/sales/services/DeliveryNoteService.js
```

Candidate method names include `postSalesDelivery`, `postDeliveryAndInvoice`, `createAndPostSalesDelivery`, `createAndPostInvoice`, `postSalesInvoice`, `postInvoice`, `createInvoice`, `createDeliveryNote`, and `execute`.

Expected module responsibility: create/post sales invoice or delivery output and generate GL, VAT, AR, inventory effects through the existing Sales/Delivery service flow.

## postPurchaseGrni

Calls existing Purchase Receipt / Purchase Invoice / GRNI approved surfaces, in this order:

```text
src/modules/purchase/services/purchase-receipt.service.js
src/modules/purchase/services/purchase-invoice.service.js
src/purchase/services/PurchasePostingService.js
```

Candidate method names include `postPurchaseGrni`, `createAndPostGrni`, `postGoodsReceipt`, `createPurchaseReceipt`, `receiveGoods`, `postReceipt`, `createAndPostPurchaseInvoice`, `postPurchaseInvoice`, `matchAndPostInvoice`, `postInvoice`, and `execute`.

Expected module responsibility: exercise GRNI recognition and clearing through existing purchase service flows.

## settleArAp

Calls existing AR/AP settlement/allocation approved surfaces, in this order:

```text
src/modules/ar-ap/services/ar-ap-settlement.service.js
src/modules/ar_ap/services/ar-ap-settlement.service.js
src/modules/arap/services/ArApSettlementService.js
src/accounting/services/ArApSettlementService.js
backend/source/services/PostingService.js
```

Candidate method names include `settleArAp`, `settleARAP`, `allocateArAp`, `allocateARAP`, `createAllocation`, `allocatePayment`, `settle`, and `executeSettlement`.

Expected module responsibility: perform AR/AP settlement/allocation using the existing append-only allocation model.

## postInventoryAdjustment

Calls existing InventoryService adjustment surfaces, in this order:

```text
src/modules/inventory/services/InventoryService.js
src/inventory/services/InventoryService.js
```

Candidate method names include `postInventoryAdjustment`, `createAndPostAdjustment`, `adjustInventory`, `postAdjustment`, `createAdjustment`, `adjustStock`, and `execute`.

Expected module responsibility: create inventory adjustment, inventory ledger movement, stock balance movement, and GL posting through the approved module/core contract.

## cancelDocument

Calls existing approved cancel/reversal surfaces, in this order:

```text
backend/source/services/PostingService.js
src/accounting/services/PostingService.js
src/modules/accounting/services/posting.service.js
src/sales/services/SalesPostingService.js
src/modules/purchase/services/purchase-invoice.service.js
```

Candidate method names include `cancelDocument`, `reverseDocument`, `createReversal`, `voidDocument`, `cancel`, `reverse`, `executeReversal`, `cancelSalesInvoice`, and `cancelPurchaseInvoice`.

Expected module responsibility: create an approved reversal/cancel document without editing/deleting original financial postings.

## Override rule

If the actual candidate uses a different existing approved service method, configure the corresponding `INT01A_*_MODULE`, `INT01A_*_EXPORT`, and `INT01A_*_METHOD` env vars. Do not point overrides to SQL scripts, stubs, mocks, or new business-logic wrappers.
