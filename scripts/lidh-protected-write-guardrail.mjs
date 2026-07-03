#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { PROTECTED_WRITE_TARGETS } from '../src/demo/lidh-env-gate.mjs';

const DEFAULT_SCOPE = ['src/demo', 'scripts/lidh-demo-server.mjs', 'scripts/lidh-smoke-test.mjs'];
const WRITE_VERBS = ['insert', 'update', 'delete', 'truncate'];
const ALLOWED_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);

function exists(p) {
  return fs.existsSync(p);
}

function walk(p) {
  if (!exists(p)) return [];
  const stat = fs.statSync(p);
  if (stat.isFile()) return [p];
  const out = [];
  for (const entry of fs.readdirSync(p)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'reports' || entry === 'docs') continue;
    out.push(...walk(path.join(p, entry)));
  }
  return out;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/--.*$/gm, ' ');
}

function scanFile(file) {
  const text = stripComments(fs.readFileSync(file, 'utf8'));
  const findings = [];
  for (const table of PROTECTED_WRITE_TARGETS) {
    for (const verb of WRITE_VERBS) {
      const pattern = verb === 'insert'
        ? new RegExp(`\\b${verb}\\s+into\\s+(?:public\\.)?[\\"\\\`]?$${table}[\\"\\\`]?`, 'i')
        : new RegExp(`\\b${verb}\\s+(?:from\\s+|table\\s+)?(?:public\\.)?[\\"\\\`]?$${table}[\\"\\\`]?`, 'i');
      void pattern;
      const simple = verb === 'insert'
        ? new RegExp(`\\b${verb}\\s+into\\s+(?:public\\.)?[\\"\\\`]?${table}[\\"\\\`]?`, 'i')
        : new RegExp(`\\b${verb}\\s+(?:from\\s+|table\\s+)?(?:public\\.)?[\\"\\\`]?${table}[\\"\\\`]?`, 'i');
      if (simple.test(text)) findings.push({ file, verb: verb.toUpperCase(), table });
    }
  }
  return findings;
}

const scope = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SCOPE;
const files = [...new Set(scope.flatMap((entry) => walk(entry)))].filter((file) => ALLOWED_EXT.has(path.extname(file)));
const findings = files.flatMap(scanFile);

if (findings.length) {
  console.error('[LIDH static protected-write guardrail] FAIL');
  for (const finding of findings) console.error(`${finding.file}: forbidden ${finding.verb} against ${finding.table}`);
  process.exit(1);
}

console.log(`[LIDH static protected-write guardrail] PASS (${files.length} implementation files scanned)`);
