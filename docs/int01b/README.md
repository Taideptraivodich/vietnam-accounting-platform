# INT-01B Approved Surface Adapter Bindings P0 v1.0

Package: `INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0.zip`

This patch provides the preferred Option A adapter module:

```text
src/int01a/int01a-approved-surface-adapter.mjs
```

The adapter exports:

```js
export async function createInt01aAdapter(context) {
  return {
    postSalesDelivery,
    postPurchaseGrni,
    settleArAp,
    postInventoryAdjustment,
    cancelDocument
  };
}
```

## Installation

From the repository root of the candidate tree:

```bash
unzip INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0.zip -d /tmp/int01b_patch
cp -R /tmp/int01b_patch/INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0/src/int01a/int01a-approved-surface-adapter.mjs ./src/int01a/int01a-approved-surface-adapter.mjs
cp -R /tmp/int01b_patch/INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0/scripts ./scripts/int01b
```

Alternative, if unpacking directly over a clean candidate repository:

```bash
unzip INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0.zip
cp -R INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0/src ./
```

## Required runtime environment

```bash
set -a
source .env.integration.local
set +a

export NODE_ENV=integration
export INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
export INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
export INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs
```

Expected MD01/EW01 preseed values must already be real database UUIDs:

```bash
export MD01_COMPANY_ID=<real UUID>
export MD01_INVENTORY_ACCOUNT_ID=<real UUID>
export MD01_COGS_ACCOUNT_ID=<real UUID>
export MD01_REVENUE_ACCOUNT_ID=<real UUID>
export MD01_EXPENSE_ACCOUNT_ID=<real UUID>
export MD01_GRNI_ACCOUNT_ID=<real UUID>
```

## Rerun command

```bash
npm run int01a:smoke
```

## Local syntax/load verification

```bash
node --check src/int01a/int01a-approved-surface-adapter.mjs
node scripts/int01b/int01b-verify-adapter-load.mjs
```

The verification script checks module load and required function binding only. It does not fake INT01A smoke results and does not execute posting flows.

## Optional approved-surface overrides

Use these only if the existing candidate tree uses different approved method names. The override must point to existing approved service/API code, not a test double, SQL script, or new business-logic wrapper.

```bash
export INT01A_POST_SALES_DELIVERY_MODULE=src/sales/services/SalesPostingService.js
export INT01A_POST_SALES_DELIVERY_EXPORT=SalesPostingService
export INT01A_POST_SALES_DELIVERY_METHOD=postSalesDelivery
export INT01A_POST_SALES_DELIVERY_CALL_SIGNATURE=input_context

export INT01A_POST_PURCHASE_GRNI_MODULE=src/modules/purchase/services/purchase-receipt.service.js
export INT01A_POST_PURCHASE_GRNI_EXPORT=PurchaseReceiptService
export INT01A_POST_PURCHASE_GRNI_METHOD=postPurchaseGrni
export INT01A_POST_PURCHASE_GRNI_CALL_SIGNATURE=input_context

export INT01A_SETTLE_ARAP_MODULE=src/modules/ar-ap/services/ar-ap-settlement.service.js
export INT01A_SETTLE_ARAP_EXPORT=ArApSettlementService
export INT01A_SETTLE_ARAP_METHOD=settleArAp
export INT01A_SETTLE_ARAP_CALL_SIGNATURE=input_context

export INT01A_POST_INVENTORY_ADJUSTMENT_MODULE=src/modules/inventory/services/InventoryService.js
export INT01A_POST_INVENTORY_ADJUSTMENT_EXPORT=InventoryService
export INT01A_POST_INVENTORY_ADJUSTMENT_METHOD=postInventoryAdjustment
export INT01A_POST_INVENTORY_ADJUSTMENT_CALL_SIGNATURE=input_context

export INT01A_CANCEL_DOCUMENT_MODULE=backend/source/services/PostingService.js
export INT01A_CANCEL_DOCUMENT_EXPORT=PostingService
export INT01A_CANCEL_DOCUMENT_METHOD=cancelDocument
export INT01A_CANCEL_DOCUMENT_CALL_SIGNATURE=input_context
```

Allowed call signatures:

```text
input_context   -> serviceMethod(input, context)
input_only      -> serviceMethod(input)
context_input   -> serviceMethod(context, input)
```

## Evidence plan for INT01A smoke

Capture the following after applying the patch:

```text
node --check src/int01a/int01a-approved-surface-adapter.mjs: PASS
node scripts/int01b/int01b-verify-adapter-load.mjs: PASS
INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs exported: PASS
INT01A-04 Approved module surface adapter/commands are bound: PASS / progressed beyond previous blocker
npm run int01a:smoke result: PASS or real downstream module/invariant failure
```

A later failure is acceptable only when it reports a real approved module surface/invariant problem. Do not mark smoke as pass unless the runner actually passes.

## Guardrails preserved

```text
No direct SQL inserts to simulate module behavior.
No accounting business logic in the adapter.
No architecture/API redesign.
No P1/P2 scope opened.
No accounting semantics changed.
No INT01A runner bypass.
```
