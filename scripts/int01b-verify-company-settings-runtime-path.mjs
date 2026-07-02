import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const bridgePath = path.resolve(repoRoot, 'src/int01a/int01b-post-sales-delivery-wiring.mjs');
const adapterPath = path.resolve(repoRoot, process.env.INT01A_ADAPTER_MODULE || 'src/int01a/int01a-approved-surface-adapter.mjs');
const repoPath = path.resolve(repoRoot, 'src/int01a/repositories/PostgresCompanySettingsRepository.cjs');

const evidence = {
  package: 'INT-01B_COMPANY_SETTINGS_RUNTIME_PATH_P0_v1_3',
  checkedAt: new Date().toISOString(),
  files: { bridgePath, adapterPath, repoPath },
  checks: [],
};

function check(name, ok, details = {}) {
  evidence.checks.push({ name, status: ok ? 'PASS' : 'FAIL', ...details });
  if (!ok) evidence.status = 'FAIL';
}

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

const bridgeSource = read(bridgePath);
const adapterSource = read(adapterPath);
const repoSource = read(repoPath);

check('bridge source exists', Boolean(bridgeSource), { file: bridgePath });
check('adapter source exists', Boolean(adapterSource), { file: adapterPath });
check('company settings repository exists', Boolean(repoSource), { file: repoPath });

check(
  'SalesInvoiceService constructor receives companySettingsRepository',
  /new\s+SalesInvoiceService\s*\(\s*\{[\s\S]*?salesInvoiceRepository[\s\S]*?companySettingsRepository[\s\S]*?\}\s*\)/.test(bridgeSource),
  { grep: 'new SalesInvoiceService({ salesInvoiceRepository, companySettingsRepository, transactionManager })' }
);

check(
  'DeliveryNoteService constructor receives companySettingsRepository when constructed',
  !/new\s+DeliveryNoteService\s*\(/.test(bridgeSource)
    || /new\s+DeliveryNoteService\s*\(\s*\{[\s\S]*?deliveryNoteRepository[\s\S]*?companySettingsRepository[\s\S]*?\}\s*\)/.test(bridgeSource),
  { grep: 'new DeliveryNoteService({ deliveryNoteRepository, companySettingsRepository, transactionManager })' }
);

check(
  'SalesPostingService constructor receives companySettingsRepository',
  /new\s+SalesPostingService\s*\(\s*\{[\s\S]*?salesInvoiceRepository[\s\S]*?deliveryNoteRepository[\s\S]*?companySettingsRepository[\s\S]*?\}\s*\)/.test(bridgeSource),
  { grep: 'new SalesPostingService({ ..., companySettingsRepository, ... })' }
);

check(
  'repository reads scoped PostgreSQL company row',
  /WHERE\s+\$\{quoteIdent\(meta\.companyColumn\)\}\s+=\s+\$1/.test(repoSource),
  { grep: 'WHERE ${quoteIdent(meta.companyColumn)} = $1' }
);

check(
  'no direct SQL inserts into protected tables in INT01A Sales/Delivery bridge',
  !/INSERT\s+INTO\s+(sales|delivery|journal|gl_|general_ledger|ar_ap|vat|inventory|stock)/i.test(bridgeSource + '\n' + adapterSource),
  { protectedTables: ['sales', 'delivery', 'journal', 'gl_', 'general_ledger', 'ar_ap', 'vat', 'inventory', 'stock'] }
);

try {
  const adapter = await import(pathToFileURL(adapterPath).href);
  check('adapter module load', true);
  const adapterInstance = typeof adapter.createInt01aAdapter === 'function'
    ? adapter.createInt01aAdapter()
    : adapter.default || adapter;
  check('createInt01aAdapter()/adapter export exposes postSalesDelivery', typeof adapterInstance.postSalesDelivery === 'function');
  for (const name of ['postPurchaseGrni', 'settleArAp', 'postInventoryAdjustment', 'cancelDocument']) {
    check(`non-Sales function preserved: ${name}`, typeof adapterInstance[name] === 'function' || typeof adapter[name] === 'function');
  }
} catch (error) {
  check('adapter module load', false, { error: error.message, stack: error.stack });
}

try {
  const bridge = await import(pathToFileURL(bridgePath).href);
  check('bridge module load', true);
  if (typeof bridge.__int01bVerifyCompanySettingsRuntimePath === 'function') {
    const runtimeProbe = bridge.__int01bVerifyCompanySettingsRuntimePath();
    evidence.runtimeProbe = runtimeProbe;
    const failedConstructor = (runtimeProbe.constructorCalls || []).find((call) => !call.hasCompanySettingsRepository);
    check('runtime constructor probe has companySettingsRepository for all checked services', !failedConstructor, { constructorCalls: runtimeProbe.constructorCalls });
  } else {
    check('runtime constructor probe exported', false, { exportName: '__int01bVerifyCompanySettingsRuntimePath' });
  }
} catch (error) {
  check('bridge runtime constructor probe', false, { error: error.message, stack: error.stack });
}

if (!evidence.status) evidence.status = 'PASS';
fs.mkdirSync(path.resolve(repoRoot, 'reports/int01a'), { recursive: true });
const outPath = path.resolve(repoRoot, 'reports/int01a/INT01B_RUNTIME_WIRING_EVIDENCE.json');
fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
if (evidence.status !== 'PASS') process.exit(1);
