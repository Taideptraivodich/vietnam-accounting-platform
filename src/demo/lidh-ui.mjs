
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

function scenarioMetaBadges(scenario) {
  const badges = [
    `Approved surface: ${scenario.action}`,
    'Local only',
    'Not UAT',
    'Not production',
  ];
  return badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join(' ');
}

export function renderDemoPage({ gate }) {
  const defaultCompanyId = process.env.MD01_COMPANY_ID || '';
  const scenarios = DEMO_SCENARIOS.map((scenario) => `
    <article class="scenario" data-scenario="${escapeHtml(scenario.slug)}">
      <h2>${escapeHtml(scenario.title)}</h2>
      <p>${escapeHtml(scenario.description)}</p>
      <div class="badges">${scenarioMetaBadges(scenario)}</div>
      <button type="button" data-run-scenario="${escapeHtml(scenario.slug)}">Run scenario</button>
    </article>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Local Interactive Demo Harness v1.0.3a</title>
  <style>
    :root { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f6f7fb; }
    body { margin: 0; }
    header { background: #1d2433; color: white; padding: 18px 24px; }
    main { padding: 20px 24px 48px; max-width: 1320px; margin: 0 auto; }
    .banner { border: 2px solid #9b2c2c; background: #fff5f5; color: #7b1d1d; font-weight: 800; padding: 12px 14px; margin: 16px 0; border-radius: 8px; letter-spacing: .01em; }
    .gate, .guidance, .scenario, .panel { background: white; border: 1px solid #d7dae3; border-radius: 10px; padding: 14px; box-shadow: 0 1px 2px rgba(18, 24, 40, .05); }
    .gate, .guidance { margin-bottom: 18px; }
    label { display: block; font-weight: 700; margin: 10px 0 6px; }
    input { width: min(100%, 580px); padding: 9px 10px; border: 1px solid #b9beca; border-radius: 7px; font: inherit; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); gap: 14px; }
    .scenario h2 { margin: 0 0 6px; font-size: 18px; }
    .scenario p { min-height: 58px; }
    button { cursor: pointer; border: 0; border-radius: 7px; background: #1d4ed8; color: white; font-weight: 700; padding: 9px 12px; margin-top: 10px; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    pre { white-space: pre-wrap; word-break: break-word; background: #101827; color: #e5e7eb; border-radius: 8px; padding: 14px; max-height: 580px; overflow: auto; }
    table { border-collapse: collapse; width: 100%; background: white; }
    th, td { border: 1px solid #d7dae3; text-align: left; padding: 7px; vertical-align: top; font-size: 13px; }
    th { background: #eef1f7; }
    ul { margin-top: 6px; }
    .status-pass, .status-fail, .status-warn, .status-info { font-weight: 800; }
    .status-pass { color: #166534; }
    .status-fail { color: #991b1b; }
    .status-warn { color: #92400e; }
    .status-info { color: #1d4ed8; }
    .pill { display: inline-block; border-radius: 999px; padding: 4px 9px; margin: 2px 4px 2px 0; font-size: 12px; font-weight: 800; border: 1px solid transparent; }
    .pill-pass { background: #ecfdf3; color: #166534; border-color: #bbf7d0; }
    .pill-fail { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
    .pill-warn { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .pill-info { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .badge { display: inline-block; background: #eef1f7; border: 1px solid #d7dae3; color: #334155; border-radius: 999px; padding: 3px 8px; margin: 2px 4px 2px 0; font-size: 12px; font-weight: 700; }
    .trace-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-top: 18px; }
    .muted { color: #64748b; }
    .note { border-left: 4px solid #f59e0b; background: #fffbeb; padding: 10px 12px; border-radius: 6px; }
    .ok { border-left: 4px solid #22c55e; background: #f0fdf4; padding: 10px 12px; border-radius: 6px; }
    .bad { border-left: 4px solid #ef4444; background: #fef2f2; padding: 10px 12px; border-radius: 6px; }
  </style>
</head>
<body>
  <header>
    <h1>Local Interactive Demo Harness v1.0.3a</h1>
  </header>
  <main>
    <div class="banner">${escapeHtml(LOCAL_DEMO_BANNER)}</div>
    <section class="gate">
      <strong>Environment gate:</strong> ${gate.ok ? '<span class="status-pass">PASS</span>' : '<span class="status-fail">FAIL</span>'}
      <div>DATABASE_URL: ${escapeHtml(gate.databaseUrlRedacted || 'not set')}</div>
      ${gate.warnings?.length ? `<div><strong>Warnings:</strong> ${escapeHtml(gate.warnings.join('; '))}</div>` : ''}
      <label for="companyId">Company ID</label>
      <input id="companyId" value="${escapeHtml(defaultCompanyId)}" placeholder="MD01 company id from the latest .env.integration.generated" />
    </section>

    <section class="guidance">
      <h2>Reviewer guidance</h2>
      <div class="note">
        This is a controlled internal smoke/demo harness only. It is not UAT and not production evidence.
        Scenario accounting status is separated from trace visibility warnings.
      </div>
      <ul>
        <li><strong>PASS</strong>: accounting invariant or scenario action completed successfully.</li>
        <li><strong>WARN</strong>: evidence/trace visibility is incomplete or not mapped clearly enough for review.</li>
        <li><strong>FAIL</strong>: scenario action or accounting invariant failed.</li>
        <li>Repeated Sales-based runs consume demo stock. If stock is exhausted, negative-stock protection may correctly block the run.</li>
      </ul>
    </section>

    <section class="grid">${scenarios}</section>

    <section class="summary-grid">
      <section class="panel">
        <h2>Execution status</h2>
        <div id="status">No scenario run yet.</div>
      </section>
      <section class="panel">
        <h2>Reviewer checklist</h2>
        <div id="checklist">Run a scenario to populate the checklist.</div>
      </section>
      <section class="panel">
        <h2>Run guidance</h2>
        <div id="runGuidance">—</div>
      </section>
    </section>

    <section class="panel" style="margin-top: 18px;">
      <h2>Stock / input evidence</h2>
      <div id="stockEvidence">—</div>
    </section>
    <section class="panel" style="margin-top: 18px;">
      <h2>Source document summary</h2>
      <div id="sourceDocs">—</div>
    </section>
    <section class="panel" style="margin-top: 18px;">
      <h2>Accounting invariant results</h2>
      <div class="muted">FAIL here means accounting/core validation failure. WARN rows are trace/readiness items.</div>
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
    const scenarioTitles = ${JSON.stringify(Object.fromEntries(DEMO_SCENARIOS.map((scenario) => [scenario.slug, scenario.title])))};

    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
    }

    function statusClass(status) {
      const normalized = String(status || 'INFO').toLowerCase();
      return ['pass', 'fail', 'warn', 'info'].includes(normalized) ? normalized : 'info';
    }

    function pill(status) {
      const normalized = String(status || 'INFO').toUpperCase();
      return '<span class="pill pill-' + statusClass(normalized) + '">' + esc(normalized) + '</span>';
    }

    function table(rows) {
      if (!rows || !rows.length) return '<span class="muted">No rows returned.</span>';
      const cols = [...new Set(rows.flatMap((row) => Object.keys(row || {})))].slice(0, 14);
      return '<table><thead><tr>' + cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map((row) => '<tr>' + cols.map((c) => '<td>' + esc(typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    }

    function list(items) {
      if (!items || !items.length) return '<span class="muted">—</span>';
      return '<ul>' + items.map((item) => '<li>' + esc(item) + '</li>').join('') + '</ul>';
    }

    function classifyFromInvariants(invariants) {
      const rows = invariants || [];
      const hasFail = rows.some((item) => item.status === 'FAIL');
      const hasWarn = rows.some((item) => item.status === 'WARN');
      return {
        accountingStatus: hasFail ? 'FAIL' : 'PASS',
        traceStatus: hasFail ? (hasWarn ? 'WARN' : 'PASS') : (hasWarn ? 'WARN' : 'PASS'),
        warnCount: rows.filter((item) => item.status === 'WARN').length,
        failCount: rows.filter((item) => item.status === 'FAIL').length,
      };
    }

    function stockSnapshotTable(snapshot) {
      if (!snapshot) return '<span class="muted">Not captured.</span>';
      const rows = snapshot.summary && snapshot.summary.length ? snapshot.summary : snapshot.rows;
      const warning = snapshot.warning ? '<div class="note">' + esc(snapshot.warning) + '</div>' : '';
      return '<div><strong>' + esc(snapshot.label || 'stock') + '</strong> ' + pill(rows && rows.length ? 'PASS' : 'WARN') + '</div>' + warning + table(rows || []);
    }

    function renderStockEvidence(result) {
      const evidence = result.evidence || {};
      const inputs = evidence.scenarioInputs ? table([evidence.scenarioInputs]) : '<span class="muted">No scenario inputs returned.</span>';
      return '<h3>Scenario inputs</h3>' + inputs +
        '<h3>Stock before</h3>' + stockSnapshotTable(evidence.stockBalanceBefore) +
        '<h3>Stock after</h3>' + stockSnapshotTable(evidence.stockBalanceAfter) +
        '<div class="note">Repeated Sales, settlement, and cancel/reversal runs may consume demo stock. If Sales fails with negative-stock protection after repeated runs, reset the disposable DB or intentionally top up stock through the approved inventory adjustment surface.</div>';
    }

    function showResult(result) {
      const review = result.review || {};
      const fallback = classifyFromInvariants(result.invariants || []);
      const accountingStatus = review.scenarioAccountingStatus || fallback.accountingStatus || result.status;
      const traceStatus = review.traceVisibilityStatus || fallback.traceStatus;
      const statusBoxClass = result.status === 'FAIL' ? 'bad' : (traceStatus === 'WARN' ? 'note' : 'ok');

      document.getElementById('status').innerHTML =
        '<div class="' + statusBoxClass + '">' +
        '<strong>' + esc(result.title || scenarioTitles[result.scenario] || result.scenario) + '</strong><br>' +
        'Scenario action status: ' + pill(result.status) + '<br>' +
        'Scenario accounting status: ' + pill(accountingStatus) + '<br>' +
        'Trace visibility status: ' + pill(traceStatus) + '<br>' +
        'Run ID: ' + esc(result.runId) + '<br>' +
        esc(banner) +
        '</div>';

      document.getElementById('checklist').innerHTML = table(review.checklist || []);
      document.getElementById('runGuidance').innerHTML = list(review.guidance || [
        'Controlled internal demo only.',
        'WARN means trace/readiness evidence needs improvement; it is not automatically an accounting failure.',
      ]);

      document.getElementById('stockEvidence').innerHTML = renderStockEvidence(result);
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
      document.getElementById('raw').textContent = JSON.stringify({
        runId: result.runId,
        companyId: result.companyId,
        actionResults: result.actionResults,
        readModel: result.readModel,
        review: result.review,
        evidence: result.evidence,
        warnings: result.warnings,
        error: result.error,
      }, null, 2);
    }

    function setRunning(isRunning, activeButton) {
      for (const button of document.querySelectorAll('[data-run-scenario]')) {
        button.disabled = isRunning;
        if (isRunning && button === activeButton) {
          button.textContent = 'Running...';
        } else if (!isRunning) {
          button.textContent = 'Run scenario';
        }
      }
      document.body.setAttribute('aria-busy', isRunning ? 'true' : 'false');
    }

    async function runScenario(slug, button) {
      const companyId = document.getElementById('companyId').value.trim();
      if (!companyId) { alert('Company ID is required. Source the latest .env.integration.generated or paste MD01_COMPANY_ID into the field.'); return; }
      setRunning(true, button);
      document.getElementById('status').innerHTML = '<div class="note">Running ' + esc(slug) + '... buttons are disabled to prevent duplicate scenario clicks.</div>';
      try {
        const response = await fetch('/api/v1/companies/' + encodeURIComponent(companyId) + '/demo/scenarios/' + encodeURIComponent(slug) + '/run', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'local-demo', confirmLocalOnly: true })
        });
        const result = await response.json();
        showResult(result);
      } catch (error) {
        showResult({ status: 'FAIL', scenario: slug, title: slug, runId: null, error: { message: error.message }, invariants: [{ name: 'HTTP request', status: 'FAIL', error: error.message }], review: { scenarioAccountingStatus: 'FAIL', traceVisibilityStatus: 'WARN', guidance: ['HTTP request failed before scenario evidence could be collected.'] } });
      } finally {
        setRunning(false, button);
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
