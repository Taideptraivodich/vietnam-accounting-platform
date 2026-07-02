import fs from 'node:fs';
import path from 'node:path';

const adapterPath = path.resolve('src/int01a/int01a-approved-surface-adapter.mjs');
const repoPath = path.resolve('src/int01a/repositories/PostgresCompanySettingsRepository.cjs');
const adapter = fs.readFileSync(adapterPath, 'utf8');
const repo = fs.readFileSync(repoPath, 'utf8');

const checks = [
  ['adapter imports PostgresCompanySettingsRepository', /PostgresCompanySettingsRepository/.test(adapter)],
  ['adapter constructs companySettingsRepository', /const\s+companySettingsRepository\s*=\s*new\s+PostgresCompanySettingsRepository/.test(adapter)],
  ['adapter passes companySettingsRepository into SalesPostingService', /new\s+SalesPostingService\s*\([\s\S]*companySettingsRepository/.test(adapter)],
  ['repository is PostgreSQL scoped', /WHERE\s+\$\{quoteIdent\(meta\.companyColumn\)\}\s+=\s+\$1/.test(repo)],
  ['repository exposes getSalesStockPattern', /async\s+getSalesStockPattern\s*\(/.test(repo)],
  ['no adapter raw ledger inserts', !/INSERT\s+INTO\s+(sales|delivery|journal|gl_|inventory|ar_ap|tax_ledger)/i.test(adapter)],
  ['no catch-ignore of companySettingsRepository required', !/companySettingsRepository is required/.test(adapter + repo)],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(JSON.stringify({ status: 'FAIL', failed: failed.map(([name]) => name) }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', checks: checks.map(([name]) => name) }, null, 2));
