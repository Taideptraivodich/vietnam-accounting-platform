#!/usr/bin/env node
import http from 'node:http';
import { evaluateLocalInteractiveDemoGate, sendForbiddenJson } from '../src/demo/lidh-env-gate.mjs';
import { renderDemoPage, renderForbiddenPage } from '../src/demo/lidh-ui.mjs';
import { runLocalDemoScenario } from '../src/demo/lidh-scenario-runner.mjs';

const runs = new Map();

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, statusCode, html) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}

function parseScenarioRun(pathname) {
  const match = pathname.match(/^\/api\/v1\/companies\/([^/]+)\/demo\/scenarios\/([^/]+)\/run$/);
  if (!match) return null;
  return { companyId: decodeURIComponent(match[1]), scenarioSlug: decodeURIComponent(match[2]) };
}

function parseTrace(pathname) {
  const match = pathname.match(/^\/api\/v1\/companies\/([^/]+)\/demo\/scenarios\/([^/]+)\/trace$/);
  if (!match) return null;
  return { companyId: decodeURIComponent(match[1]), runId: decodeURIComponent(match[2]) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const gate = evaluateLocalInteractiveDemoGate();

  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/demo/internal')) {
      if (!gate.ok) return sendHtml(res, 403, renderForbiddenPage(gate));
      return sendHtml(res, 200, renderDemoPage({ gate }));
    }

    const runRequest = req.method === 'POST' ? parseScenarioRun(url.pathname) : null;
    if (runRequest) {
      if (!gate.ok) return sendForbiddenJson(res, gate);
      const body = await readJsonBody(req);
      const result = await runLocalDemoScenario({ ...runRequest, body });
      runs.set(result.runId, result);
      return sendJson(res, result.status === 'PASS' ? 200 : 500, result);
    }

    const traceRequest = req.method === 'GET' ? parseTrace(url.pathname) : null;
    if (traceRequest) {
      if (!gate.ok) return sendForbiddenJson(res, gate);
      const result = runs.get(traceRequest.runId);
      if (!result) return sendJson(res, 404, { status: 'FAIL', error: `Run ID not found in this local server process: ${traceRequest.runId}` });
      return sendJson(res, 200, {
        status: result.status,
        runId: result.runId,
        companyId: result.companyId,
        sourceDocuments: result.sourceDocuments,
        trace: result.trace,
        invariants: result.invariants,
        readModel: result.readModel,
        banner: result.banner,
      });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendJson(res, statusCode, { status: 'FAIL', error: { name: error.name, message: error.message, details: error.details }, banner: gate.banner });
  }
});

const host = process.env.LIDH_HOST || '127.0.0.1';
const port = Number(process.env.LIDH_PORT || 3000);
server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Local Interactive Demo Harness v1.0.3a listening on http://${host}:${port}/demo/internal`);
});
