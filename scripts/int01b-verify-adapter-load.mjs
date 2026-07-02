import { pathToFileURL } from 'node:url';
import path from 'node:path';

const adapterPath = process.env.INT01A_ADAPTER_MODULE
  ? path.resolve(process.env.INT01A_ADAPTER_MODULE)
  : path.resolve('src/int01a/int01a-approved-surface-adapter.mjs');

const adapter = await import(pathToFileURL(adapterPath).href);
const required = ['postSalesDelivery', 'postPurchaseGrni', 'settleArAp', 'postInventoryAdjustment', 'cancelDocument'];
const missing = required.filter((name) => typeof adapter[name] !== 'function');
if (missing.length) {
  throw new Error(`INT-01B adapter missing required functions: ${missing.join(', ')}`);
}
console.log(JSON.stringify({ status: 'PASS', adapterPath, required }, null, 2));
