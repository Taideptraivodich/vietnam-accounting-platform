#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

echo "[INT-01C static] node --check patched files"
node --check src/int01a/int01a-sales-stock-precondition-bridge.mjs
node --check src/int01a/int01a-approved-surface-adapter-int01c.mjs

echo "[INT-01C static] required adapter exports present in wrapper"
grep -nE "export (async function|const) (postSalesDelivery|postPurchaseGrni|settleArAp|postInventoryAdjustment|cancelDocument)\b" \
  src/int01a/int01a-approved-surface-adapter-int01c.mjs

echo "[INT-01C static] protected-table direct write scan"
PROTECTED_WRITE_HITS="$(grep -RInE "\b(insert|update)\b[^\n;]*(stock_balances|inventory_ledger_entries)|(stock_balances|inventory_ledger_entries)[^\n;]*\b(insert|update)\b|\.insert\s*\([^)]*(stock_balances|inventory_ledger_entries)|\.update\s*\([^)]*(stock_balances|inventory_ledger_entries)" \
  src/int01a/int01a-sales-stock-precondition-bridge.mjs \
  src/int01a/int01a-approved-surface-adapter-int01c.mjs \
  | grep -vE ':\s*(//|/\*|\*)' || true)"
if [[ -n "$PROTECTED_WRITE_HITS" ]]; then
  echo "$PROTECTED_WRITE_HITS"
  echo "[INT-01C static] FAIL: protected-table direct write pattern detected" >&2
  exit 1
fi

echo "[INT-01C static] protected inventory table scan passed found in patched files"

echo "[INT-01C static] approved surface call evidence"
grep -nE "postInventoryAdjustment|postPurchaseGrni|EW-05|EW-04" \
  src/int01a/int01a-sales-stock-precondition-bridge.mjs \
  src/int01a/int01a-approved-surface-adapter-int01c.mjs

echo "[INT-01C static] PASS"
