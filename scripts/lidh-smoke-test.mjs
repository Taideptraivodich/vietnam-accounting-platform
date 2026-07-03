#!/usr/bin/env node
import assert from 'node:assert/strict';
import { DEMO_SCENARIOS, runLocalDemoScenario } from '../src/demo/lidh-scenario-runner.mjs';
import { evaluateLocalInteractiveDemoGate, LOCAL_DEMO_BANNER } from '../src/demo/lidh-env-gate.mjs';

const args = new Set(process.argv.slice(2));
const runActions = args.has('--run-actions');
const companyArg = process.argv.find((arg) => arg.startsWith('--company-id='));
const companyId = companyArg ? companyArg.split('=').slice(1).join('=') : process.env.MD01_COMPANY_ID;

const gate = evaluateLocalInteractiveDemoGate();
assert.equal(LOCAL_DEMO_BANNER, 'LOCAL INTERNAL DEMO ONLY — NOT UAT — NOT PRODUCTION');
assert.equal(DEMO_SCENARIOS.length, 5, 'exactly five local demo scenarios must be registered');
assert.deepEqual(DEMO_SCENARIOS.map((s) => s.slug), [
  'sales-ar-vat-inventory-gl',
  'purchase-grni',
  'inventory-movement-consistency',
  'ar-ap-settlement-visibility',
  'cancel-reversal-verification',
]);

if (!gate.ok) {
  console.error('[LIDH smoke] ENV_GATE_FAIL');
  console.error(JSON.stringify(gate, null, 2));
  process.exit(1);
}

if (!runActions) {
  console.log('[LIDH smoke] PASS env/UI contract');
  console.log('Use --run-actions --company-id=<MD01_COMPANY_ID> after migrations + seed to execute all five scenarios.');
  process.exit(0);
}

if (!companyId) {
  console.error('[LIDH smoke] FAIL: --company-id or MD01_COMPANY_ID is required for action smoke.');
  process.exit(1);
}

const results = [];
for (const scenario of DEMO_SCENARIOS) {
  const result = await runLocalDemoScenario({ scenarioSlug: scenario.slug, companyId, body: { mode: 'local-demo', confirmLocalOnly: true } });
  results.push({ scenario: scenario.slug, status: result.status, runId: result.runId, invariants: result.invariants.map((i) => ({ name: i.name, status: i.status })) });
  if (result.status !== 'PASS') {
    console.error('[LIDH smoke] FAIL');
    console.error(JSON.stringify({ failedScenario: scenario.slug, result }, null, 2));
    process.exit(1);
  }
}

console.log('[LIDH smoke] PASS all five scenarios');
console.log(JSON.stringify(results, null, 2));
