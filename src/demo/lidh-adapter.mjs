import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DEFAULT_APPROVED_ADAPTER = '../int01a/int01a-approved-surface-adapter-int01c.mjs';
const REQUIRED_SURFACES = Object.freeze([
  'postSalesDelivery',
  'postPurchaseGrni',
  'postInventoryAdjustment',
  'settleArAp',
  'cancelDocument',
]);

function moduleSpecifierToUrl(specifier) {
  if (!specifier || specifier === DEFAULT_APPROVED_ADAPTER) {
    return new URL(DEFAULT_APPROVED_ADAPTER, import.meta.url).href;
  }
  if (/^(file|https?):/.test(specifier)) return specifier;
  return pathToFileURL(path.resolve(process.cwd(), specifier)).href;
}

export async function loadApprovedDemoAdapter() {
  const specifier = process.env.LIDH_APPROVED_ADAPTER_MODULE || process.env.INT01A_ADAPTER_MODULE || DEFAULT_APPROVED_ADAPTER;
  const adapter = await import(moduleSpecifierToUrl(specifier));
  const missing = REQUIRED_SURFACES.filter((name) => typeof adapter[name] !== 'function');
  if (missing.length) {
    const error = new Error(`Approved INT01A/INT01D adapter missing required surfaces: ${missing.join(', ')}`);
    error.details = { specifier, required: REQUIRED_SURFACES, available: Object.keys(adapter).sort() };
    throw error;
  }
  return { adapter, specifier, required: REQUIRED_SURFACES };
}
