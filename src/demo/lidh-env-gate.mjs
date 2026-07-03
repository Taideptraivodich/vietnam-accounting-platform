export const LOCAL_DEMO_BANNER = 'LOCAL INTERNAL DEMO ONLY — NOT UAT — NOT PRODUCTION';

export const PROTECTED_WRITE_TARGETS = Object.freeze([
  'journal_entries',
  'gl_entries',
  'tax_ledger_entries',
  'ar_ap_ledger_entries',
  'ar_ap_allocations',
  'inventory_ledger_entries',
  'stock_balances',
  'purchase_receipts',
  'purchase_invoices',
  'sales_invoices',
  'delivery_notes',
]);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const UNSAFE_DATABASE_MARKERS = /(^|[^a-z])(prod|production|uat|live|customer)([^a-z]|$)/i;

export class LocalInteractiveDemoForbidden extends Error {
  constructor(errors, warnings = []) {
    super(`Local interactive demo disabled: ${errors.join('; ')}`);
    this.name = 'LocalInteractiveDemoForbidden';
    this.statusCode = 403;
    this.errors = errors;
    this.warnings = warnings;
  }
}

export function redactDatabaseUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

function databaseLooksDisposable(url) {
  const databaseName = decodeURIComponent((url.pathname || '').replace(/^\//, ''));
  const markerText = `${databaseName} ${url.hostname}`;
  return !UNSAFE_DATABASE_MARKERS.test(markerText);
}

export function evaluateLocalInteractiveDemoGate(env = process.env) {
  const errors = [];
  const warnings = [];

  if (env.DEMO_INTERACTIVE_ENABLED !== 'true') {
    errors.push('DEMO_INTERACTIVE_ENABLED must be exactly true');
  }

  if ((env.NODE_ENV || '').toLowerCase() === 'production') {
    errors.push('NODE_ENV must not be production');
  }

  if (!env.NODE_ENV) {
    warnings.push('NODE_ENV is not set; use development or integration for local demo runs');
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL is required');
  } else {
    try {
      const parsed = new URL(databaseUrl);
      if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
        errors.push('DATABASE_URL must use PostgreSQL protocol');
      }
      if (!LOCAL_HOSTS.has(parsed.hostname)) {
        errors.push('DATABASE_URL host must be localhost, 127.0.0.1, or ::1 for the disposable local demo database');
      }
      if (!databaseLooksDisposable(parsed)) {
        errors.push('DATABASE_URL database/host contains a production/UAT/live/customer marker and is refused');
      }
    } catch {
      errors.push('DATABASE_URL must be a valid PostgreSQL URL');
    }
  }

  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    banner: LOCAL_DEMO_BANNER,
    errors,
    warnings,
    databaseUrlRedacted: redactDatabaseUrl(databaseUrl),
  };
}

export function assertLocalInteractiveDemoEnabled(env = process.env) {
  const gate = evaluateLocalInteractiveDemoGate(env);
  if (!gate.ok) throw new LocalInteractiveDemoForbidden(gate.errors, gate.warnings);
  return gate;
}

export function sendForbiddenJson(res, gate = evaluateLocalInteractiveDemoGate()) {
  res.statusCode = 403;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    status: 'FAIL',
    error: 'Local interactive demo disabled',
    banner: LOCAL_DEMO_BANNER,
    gate,
  }, null, 2));
}
