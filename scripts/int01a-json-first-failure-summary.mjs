#!/usr/bin/env node
/*
 * LOCAL_RUNBOOK v1.0.6 JSON-first INT01A failure summary.
 *
 * JSON report is source of truth. Console parsing is fallback only and is
 * explicitly marked as fallback.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    reportsDir: 'reports/int01a',
    consoleLog: undefined,
    failOnFail: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--reports-dir') args.reportsDir = argv[++i];
    else if (token === '--console-log') args.consoleLog = argv[++i];
    else if (token === '--fail-on-fail') args.failOnFail = true;
    else if (token === '--help' || token === '-h') {
      console.log('Usage: node scripts/int01a-json-first-failure-summary.mjs [--reports-dir reports/int01a] [--console-log path] [--fail-on-fail]');
      process.exit(0);
    }
  }
  return args;
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function candidateStepArrays(report) {
  return [
    report?.steps,
    report?.results,
    report?.checks,
    report?.stepResults,
    report?.step_results,
    report?.int01a?.steps,
    report?.int01a?.results,
    report?.smoke?.steps,
    report?.smoke?.results,
    Array.isArray(report) ? report : undefined,
  ]
    .filter(Array.isArray)
    .filter((items) => items.length > 0);
}

function normalizeStep(step, index) {
  const error = firstDefined(
    step?.error,
    step?.failure,
    Array.isArray(step?.errors) ? step.errors[0] : undefined,
    step?.exception
  );

  const errorName = firstDefined(
    error?.name,
    error?.code,
    error?.errorName,
    step?.errorName,
    step?.error_name,
    step?.code,
    ''
  );

  const errorMessage = firstDefined(
    error?.message,
    error?.msg,
    step?.errorMessage,
    step?.error_message,
    step?.message,
    step?.reason,
    ''
  );

  const details = firstDefined(
    error?.details,
    error?.detail,
    error?.cause,
    step?.details,
    step?.detail,
    step?.metadata?.errorDetails,
    step?.metadata?.error_details
  );

  return {
    index,
    id: String(firstDefined(step?.id, step?.stepId, step?.step_id, step?.code, step?.name, `STEP-${index}`)),
    title: String(firstDefined(step?.title, step?.description, step?.label, step?.name, '')),
    status: String(firstDefined(step?.status, step?.result, step?.state, '')).toUpperCase(),
    errorName: String(errorName),
    errorMessage: String(errorMessage),
    details,
    raw: step,
  };
}

function findSteps(report) {
  const arrays = candidateStepArrays(report);
  if (arrays.length === 0) return [];
  return arrays[0].map(normalizeStep);
}

function formatDetails(details) {
  if (details === undefined || details === null || details === '') return '';
  if (typeof details === 'string') return details;
  return JSON.stringify(details, null, 2);
}

function summarizeJsonReport(report, reportPath) {
  const steps = findSteps(report);
  const firstFailure = steps.find((step) => step.status !== 'PASS');
  const reportStatus = String(firstDefined(report?.status, report?.result, firstFailure ? 'FAIL' : 'PASS')).toUpperCase();

  return {
    source: 'JSON',
    reportPath,
    reportStatus,
    stepsCount: steps.length,
    firstFailure,
  };
}

function printSummary(summary) {
  console.log('INT01A summary source: JSON report');
  console.log(`INT01A report path: ${summary.reportPath}`);
  console.log(`INT01A report status: ${summary.reportStatus}`);
  console.log(`INT01A step count: ${summary.stepsCount}`);

  if (!summary.firstFailure) {
    console.log('First failing step: none');
    console.log('INT01A JSON source of truth reports all parsed steps PASS');
    return;
  }

  const failure = summary.firstFailure;
  console.log(`First failing step: ${failure.id}`);
  console.log(`First failing step title: ${failure.title}`);
  console.log(`Error name: ${failure.errorName}`);
  console.log(`Error message: ${failure.errorMessage}`);
  const details = formatDetails(failure.details);
  if (details) {
    console.log('Error details:');
    console.log(details);
  }
}

function fallbackFromConsole(consoleLog) {
  if (!consoleLog || !fs.existsSync(consoleLog)) {
    return {
      used: true,
      reason: 'JSON missing/invalid and console log path missing',
      failure: undefined,
    };
  }

  const text = fs.readFileSync(consoleLog, 'utf8');
  const lines = text.split(/\r?\n/);
  const failLine = lines.find((line) => /INT01A-\d+/i.test(line) && /\b(FAIL|FAILED|ERROR)\b/i.test(line) && !/\bPASS\b/i.test(line));
  const match = failLine?.match(/(INT01A-\d+)/i);
  return {
    used: true,
    reason: 'JSON missing/invalid; console parsing fallback used',
    failure: match
      ? {
          id: match[1].toUpperCase(),
          title: failLine.trim(),
          status: 'FAIL',
          errorName: '',
          errorMessage: failLine.trim(),
        }
      : undefined,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const files = listJsonFiles(args.reportsDir);
  let summary;
  let parseError;

  if (files.length > 0) {
    const latest = files[0].filePath;
    try {
      const report = JSON.parse(fs.readFileSync(latest, 'utf8'));
      summary = summarizeJsonReport(report, latest);
    } catch (error) {
      parseError = error;
    }
  }

  if (!summary) {
    console.log('INT01A summary source: FALLBACK console parsing');
    if (files.length === 0) console.log(`JSON report missing: no *.json files under ${args.reportsDir}`);
    if (parseError) console.log(`JSON report invalid: ${parseError.name}: ${parseError.message}`);
    const fallback = fallbackFromConsole(args.consoleLog);
    console.log(`Fallback reason: ${fallback.reason}`);
    if (fallback.failure) {
      console.log(`First failing step: ${fallback.failure.id}`);
      console.log(`First failing step title: ${fallback.failure.title}`);
      console.log(`Error name: ${fallback.failure.errorName}`);
      console.log(`Error message: ${fallback.failure.errorMessage}`);
      if (args.failOnFail) process.exit(1);
      return;
    }
    console.log('First failing step: unknown');
    if (args.failOnFail) process.exit(1);
    return;
  }

  printSummary(summary);
  if (args.failOnFail && summary.firstFailure) process.exit(1);
}

main();
