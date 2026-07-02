#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
ROOT="$(cd "$ROOT" && pwd)"
ADAPTER="$ROOT/src/int01a/int01a-approved-surface-adapter-int01c.mjs"
UPSTREAM="$ROOT/src/int01a/int01a-approved-surface-adapter-int01c.pre-int01d.mjs"
HELPER="$ROOT/src/int01a/int01d-inventory-stock-in-wiring.mjs"

fail() {
  echo "[INT01D][STATIC][FAIL] $*" >&2
  exit 1
}

pass() {
  echo "[INT01D][STATIC][PASS] $*"
}

[[ -f "$ADAPTER" ]] || fail "missing active adapter: $ADAPTER"
[[ -f "$UPSTREAM" ]] || fail "missing preserved upstream INT-01C adapter: $UPSTREAM"
[[ -f "$HELPER" ]] || fail "missing INT-01D helper: $HELPER"

node --check "$ADAPTER" >/dev/null || fail "active adapter has syntax errors"
node --check "$HELPER" >/dev/null || fail "INT-01D helper has syntax errors"
pass "syntax checks passed for active adapter and INT-01D helper"

for export_name in postSalesDelivery postPurchaseGrni settleArAp postInventoryAdjustment cancelDocument; do
  grep -Eq "export[[:space:]]+async[[:space:]]+function[[:space:]]+$export_name|$export_name" "$ADAPTER" \
    || fail "required adapter export not present in active adapter text: $export_name"
done
pass "required adapter exports remain present: postSalesDelivery, postPurchaseGrni, settleArAp, postInventoryAdjustment, cancelDocument"

if grep -Eqi "Approved module surface not wired|PendingSurface|fail-closed placeholder|nextBlocker.*INVENTORY_ADJUSTMENT_WIRING_REQUIRED|postInventoryAdjustment.*not wired" "$ADAPTER"; then
  fail "active postInventoryAdjustment still resembles a fail-closed placeholder"
fi
pass "postInventoryAdjustment is no longer the fail-closed placeholder in the active INT-01C adapter path"

grep -Eq "EW05_MODULE_CANDIDATES|InventoryService|postInventoryAdjustment|postOpeningStock|postInventoryStockIn" "$HELPER" \
  || fail "INT-01D helper does not show approved EW-05 inventory surface resolution"
grep -Eq "EW04_MODULE_CANDIDATES|postPurchaseGrni|postPurchaseReceipt|postGoodsReceipt" "$HELPER" \
  || fail "INT-01D helper does not show approved EW-04 fallback surface resolution"
pass "helper resolves approved EW-05 inventory service path with EW-04 purchase stock-in fallback"

node --input-type=module - "$ADAPTER" "$HELPER" <<'NODE'
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const protectedTables = ['stock_balances', 'inventory_ledger_entries'];
const writePattern = /\b(insert|update|delete|merge)\b[\s\S]{0,180}\b(stock_balances|inventory_ledger_entries)\b|\b(stock_balances|inventory_ledger_entries)\b[\s\S]{0,180}\b(insert|update|delete|merge)\b/i;
const negativeStockBypass = /allowNegativeStock\s*[:=]\s*true|disableNegativeStock|skipNegativeStock|negativeStock\w*\s*[:=]\s*false|bypassNegativeStock/i;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (writePattern.test(text)) {
    console.error(`[INT01D][STATIC][FAIL] direct protected inventory-table write pattern found in ${file}`);
    process.exit(1);
  }
  if (negativeStockBypass.test(text)) {
    console.error(`[INT01D][STATIC][FAIL] negative-stock bypass pattern found in ${file}`);
    process.exit(1);
  }
}
NODE
pass "no direct SQL writes to stock_balances or inventory_ledger_entries in INT-01D active patch files"
pass "no negative-stock validation bypass pattern in INT-01D active patch files"

if [[ "${INT01D_IMPORT_VERIFY:-0}" == "1" ]]; then
  node --input-type=module - "$ADAPTER" <<'NODE'
const adapterPath = process.argv[2];
const adapter = await import(adapterPath);
for (const name of ['postSalesDelivery', 'postPurchaseGrni', 'settleArAp', 'postInventoryAdjustment', 'cancelDocument']) {
  if (typeof adapter[name] !== 'function') {
    throw new Error(`required export is not callable: ${name}`);
  }
}
console.log('[INT01D][STATIC][PASS] optional ESM import verification passed');
NODE
else
  echo "[INT01D][STATIC][INFO] Optional import verification skipped. Set INT01D_IMPORT_VERIFY=1 after DB/service env is ready."
fi

pass "INT-01D static verification complete"
