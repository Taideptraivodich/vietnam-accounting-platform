import { LOCAL_DEMO_BANNER } from './lidh-env-gate.mjs';
import { DEMO_SCENARIOS } from './lidh-scenario-runner.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderDemoPage({ gate }) {
  const defaultCompanyId = process.env.MD01_COMPANY_ID || '';
  const scenarios = DEMO_SCENARIOS.map((scenario) => `
    <article class="scenario" data-scenario="${escapeHtml(scenario.slug)}">
      <h2>${escapeHtml(scenario.title)}</h2>
      <p>${escapeHtml(scenario.description)}</p>
      <button type="button" data-run-scenario="${escapeHtml(scenario.slug)}">Run scenario</button>
    </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Local Interactive Demo Harness v1.0.3</title>
  <style>
    :root { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f6f7fb; }
    body { margin: 0; }
    header { background: #1d2433; color: white; padding: 18px 24px; }
    main { padding: 20px 24px 48px; max-width: 1240px; margin: 0 auto; }
    .banner { border: 2px solid #9b2c2c; background: #fff5f5; color: #7b1d1d; font-weight: 800; padding: 12px 14px; margin: 16px 0; border-radius: 8px; letter-spacing: .01em; }
    .gate { background: white; border: 1px solid #d7dae3; border-radius: 10px; padding: 14px; margin-bottom: 18px; }
    label { display: block; font-weight: 700; margin: 10px 0 6px; }
    input { width: min(100%, 520px); padding: 9px 10px; border: 1px solid #b9beca; border-radius: 7px; font: inherit; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); gap: 14px; }
    .scenario, .panel { background: white; border: 1px solid #d7dae3; border-radius: 10px; padding: 14px; box-shadow: 0 1px 2px rgba(18, 24, 40, .05); }
    .scenario h2 { margin: 0 0 6px; font-size: 18px; }
    .scenario p { min-height: 58px; }
    button { cursor: pointer; border: 0; border-radius: 7px; background: #1d4ed8; color: white; font-weight: 700; padding: 9px 12px; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    pre { white-space: pre-wrap; word-break: break-word; background: #101827; color: #e5e7eb; border-radius: 8px; padding: 14px; max-height: 580px; overflow: auto; }
    table { border-collapse: collapse; width: 100%; background: white; }
    th, td { border: 1px solid #d7dae3; text-align: left; padding: 7px; vertical-align: top; font-size: 13px; }
    th { background: #eef1f7; }
    .status-pass { color: #166534; font-weight: 800; }
    .status-fail { color: #991b1b; font-weight: 800; }
    .status-warn { color: #92400e; font-weight: 800; }
    .trace-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
  </style>
</head>
<body>
  <header>
    <h1>Local Interactive Demo Harness v1.0.3</h1>
  </header>
  <main>
    <div class="banner">${escapeHtml(LOCAL_DEMO_BANNER)}</div>
    <section class="gate">
      <strong>Environment gate:</strong> ${gate.ok ? '<span class="status-pass">PASS</span>' : '<span class="status-fail">FAIL</span>'}
      <div>DATABASE_URL: ${escapeHtml(gate.databaseUrlRedacted || 'not set')}</div>
      ${gate.warnings?.length ? `<div><strong>Warnings:</strong> ${escapeHtml(gate.warnings.join('; '))}</div>` : ''}
      <label for="companyId">Company ID</label>
      <input id="companyId" value="${escapeHtml(defaultCompanyId)}" placeholder="MD01 company id" />
    </section>
    <section class="grid">${scenarios}</section>
    <section class="panel" style="margin-top: 18px;">
      <h2>Execution status</h2>
      <div id="status">No scenario run yet.</div>
    </section>
    <section class="panel" style="margin-top: 18px;">
      <h2>Source document summary</h2>
      <div id="sourceDocs">—</div>
    </section>
    <section class="panel" style="margin-top: 18px;">
      <h2>Invariant results</h2>
      <div id="invariants">—</div>
    </section>
    <section class="trace-grid" style="margin-top: 18px;">
      <div class="panel"><h2>GL trace</h2><div id="glTrace">—</div></div>
      <div class="panel"><h2>AR trace</h2><div id="arTrace">—</div></div>
      <div class="panel"><h2>AP trace</h2><div id="apTrace">—</div></div>
      <div class="panel"><h2>Tax/VAT trace</h2><div id="taxTrace">—</div></div>
      <div class="panel"><h2>Inventory trace</h2><div id="inventoryTrace">—</div></div>
      <div class="panel"><h2>Stock balance cache</h2><div id="stockTrace">—</div></div>
    </section>
    <section class="panel" style="margin-top: 18px;">
      <h2>Full trace JSON</h2>
      <pre id="trace">—</pre>
    </section>
    <section class="panel" style="margin-top: 18px;">
      <h2>Raw IDs and full result</h2>
      <pre id="raw">—</pre>
    </section>
  </main>
  <script>
    const banner = ${JSON.stringify(LOCAL_DEMO_BANNER)};
    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
    }
    function table(rows) {
      if (!rows || !rows.length) return '—';
      const cols = [...new Set(rows.flatMap((row) => Object.keys(row || {})))].slice(0, 12);
      return '<table><thead><tr>' + cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map((row) => '<tr>' + cols.map((c) => '<td>' + esc(typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    }
    function showResult(result) {
      document.getElementById('status').innerHTML = '<strong>' + esc(result.title || result.scenario) + '</strong> — <span class="status-' + esc(String(result.status || '').toLowerCase()) + '">' + esc(result.status) + '</span><br>Run ID: ' + esc(result.runId) + '<br>' + esc(banner);
      document.getElementById('sourceDocs').innerHTML = table(result.sourceDocuments || []);
      document.getElementById('invariants').innerHTML = table(result.invariants || []);
      const trace = result.trace || {};
      document.getElementById('glTrace').innerHTML = table(trace.gl || []);
      document.getElementById('arTrace').innerHTML = table(trace.ar || []);
      document.getElementById('apTrace').innerHTML = table(trace.ap || []);
      document.getElementById('taxTrace').innerHTML = table(trace.tax || []);
      document.getElementById('inventoryTrace').innerHTML = table(trace.inventory || []);
      document.getElementById('stockTrace').innerHTML = table(trace.stockBalances || []);
      document.getElementById('trace').textContent = JSON.stringify(trace, null, 2);
      document.getElementById('raw').textContent = JSON.stringify({ runId: result.runId, companyId: result.companyId, actionResults: result.actionResults, readModel: result.readModel, warnings: result.warnings, error: result.error }, null, 2);
    }
    async function runScenario(slug, button) {
      const companyId = document.getElementById('companyId').value.trim();
      if (!companyId) { alert('Company ID is required. Set MD01_COMPANY_ID or paste it into the field.'); return; }
      button.disabled = true;
      document.getElementById('status').textContent = 'Running ' + slug + '...';
      try {
        const response = await fetch('/api/v1/companies/' + encodeURIComponent(companyId) + '/demo/scenarios/' + encodeURIComponent(slug) + '/run', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'local-demo', confirmLocalOnly: true })
        });
        const result = await response.json();
        showResult(result);
      } catch (error) {
        showResult({ status: 'FAIL', scenario: slug, title: slug, runId: null, error: { message: error.message }, invariants: [{ name: 'HTTP request', status: 'FAIL', error: error.message }] });
      } finally {
        button.disabled = false;
      }
    }
    for (const button of document.querySelectorAll('[data-run-scenario]')) {
      button.addEventListener('click', () => runScenario(button.getAttribute('data-run-scenario'), button));
    }
  </script>
</body>
</html>`;
}

export function renderForbiddenPage(gate) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Forbidden</title></head><body><h1>${escapeHtml(LOCAL_DEMO_BANNER)}</h1><h2>403 — Local interactive demo disabled</h2><pre>${escapeHtml(JSON.stringify(gate, null, 2))}</pre></body></html>`;
}
