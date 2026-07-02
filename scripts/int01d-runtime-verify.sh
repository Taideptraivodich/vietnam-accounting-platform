#!/usr/bin/env bash
set -euo pipefail

REPORTS_INT01A="${1:-reports/int01a}"
REPORTS_INT01C="${2:-reports/int01c}"

fail() {
  echo "[INT01D][RUNTIME][FAIL] $*" >&2
  exit 1
}

info() {
  echo "[INT01D][RUNTIME][INFO] $*"
}

[[ -d "$REPORTS_INT01A" ]] || fail "missing INT01A reports dir: $REPORTS_INT01A"

LATEST_JSON="$(find "$REPORTS_INT01A" -type f -name '*.json' -print0 | xargs -0 ls -1t 2>/dev/null | head -n 1 || true)"
[[ -n "$LATEST_JSON" ]] || fail "no INT01A JSON report found under $REPORTS_INT01A"

info "Using INT01A JSON report: $LATEST_JSON"
[[ -d "$REPORTS_INT01C" ]] && info "INT01C reports dir present: $REPORTS_INT01C" || info "INT01C reports dir not present; continuing with INT01A JSON evidence only"

node --input-type=module - "$LATEST_JSON" <<'NODE'
import { readFileSync } from 'node:fs';

const reportPath = process.argv[2];
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const steps = Array.isArray(report.steps) ? report.steps : [];
const byId = new Map(steps.map((step) => [step.id, step]));

function fail(message) {
  console.error(`[INT01D][RUNTIME][FAIL] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[INT01D][RUNTIME][PASS] ${message}`);
}

for (const id of ['INT01A-00', 'INT01A-01', 'INT01A-02', 'INT01A-03', 'INT01A-04']) {
  const step = byId.get(id);
  if (!step || step.status !== 'PASS') {
    fail(`${id} is not PASS in canonical JSON`);
  }
}
pass('INT01A-00 through INT01A-04 are PASS');

const int01a05 = byId.get('INT01A-05');
if (!int01a05) {
  fail('INT01A-05 is missing from canonical JSON');
}

const errorText = JSON.stringify(int01a05.error || {});
const oldBlocker = /Approved module surface not wired.*postInventoryAdjustment|postInventoryAdjustment approved surface not wired|INT01A_INVENTORY_ADJUSTMENT_WIRING_REQUIRED/.test(errorText);

if (int01a05.status === 'FAIL' && oldBlocker) {
  fail('INT01A-05 still fails with the pre-INT01D postInventoryAdjustment wiring blocker');
}

if (int01a05.status === 'PASS') {
  pass('INT01A-05 no longer fails on postInventoryAdjustment wiring and is PASS');
} else {
  console.log(`[INT01D][RUNTIME][INFO] INT01A-05 status is ${int01a05.status}; old wiring blocker is cleared.`);
}

const firstFail = steps.find((step) => step.status === 'FAIL');
if (firstFail) {
  console.log('[INT01D][RUNTIME][INFO] First failing step from JSON after INT-01D:');
  console.log(JSON.stringify({
    id: firstFail.id,
    title: firstFail.title,
    status: firstFail.status,
    error: firstFail.error || null
  }, null, 2));
} else {
  pass('No failing INT01A step found in canonical JSON');
}

console.log(JSON.stringify({
  int01dRuntimeVerification: 'PASS',
  reportPath,
  int01a05Status: int01a05.status,
  firstFailingStep: firstFail ? firstFail.id : null
}, null, 2));
NODE
