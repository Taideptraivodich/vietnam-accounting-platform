const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PurchaseAccountResolver,
  REQUIRED_ACCOUNT_SUBTYPES,
} = require('../src/modules/purchase/services/purchase-account-resolver.service');

const COMPANY_ID = 'company-1';
const LEGACY_MAPPING_TABLE = ['company', 'account', 'mappings'].join('_');

function makeDb({ hasAccountMappings = true, accountMappings = [], accounts = [], grniMetadata = [] }) {
  const queriedTables = [];

  function matches(row, whereObj) {
    return Object.entries(whereObj || {}).every(([key, value]) => row[key] === value);
  }

  function makeQuery(table) {
    let rows = table === 'account_mappings'
      ? [...accountMappings]
      : table === 'accounts'
        ? [...accounts]
        : table === 'grni_account_metadata'
          ? [...grniMetadata]
          : [];

    const q = {
      where(whereObj) {
        rows = rows.filter((row) => matches(row, whereObj));
        return q;
      },
      whereIn(column, values) {
        rows = rows.filter((row) => values.includes(row[column]));
        return q;
      },
      select(...columns) {
        if (!columns.length) return q;
        rows = rows.map((row) => {
          const projected = {};
          for (const column of columns) {
            if (typeof column === 'string') {
              projected[column] = row[column];
            } else if (column && typeof column === 'object') {
              for (const [alias, source] of Object.entries(column)) {
                projected[alias] = row[source];
              }
            }
          }
          return projected;
        });
        return q;
      },
      limit(count) {
        return Promise.resolve(rows.slice(0, count));
      },
      first() {
        return Promise.resolve(rows[0] || null);
      },
    };
    return q;
  }

  const db = (table) => {
    queriedTables.push(table);
    return makeQuery(table);
  };
  db.schema = {
    hasTable: async (tableName) => {
      if (tableName === 'account_mappings') return hasAccountMappings;
      if (tableName === 'grni_account_metadata') return true;
      if (tableName === LEGACY_MAPPING_TABLE) return false;
      return false;
    },
  };
  db.queriedTables = queriedTables;
  return db;
}

test('resolver uses canonical EW-01 account_mappings table', async () => {
  const db = makeDb({
    accountMappings: [{ company_id: COMPANY_ID, mapping_key: 'purchase.vat_input', account_id: 'acct-vat-input-id' }],
    accounts: [{
      company_id: COMPANY_ID,
      id: 'acct-vat-input-id',
      code: '1331',
      name: 'VAT Input',
      account_type: 'asset',
      account_subtype: 'vat_input',
    }],
  });
  const resolver = new PurchaseAccountResolver({ db });

  const account = await resolver.resolveVATInputAccount(COMPANY_ID);

  assert.equal(account.account_id, 'acct-vat-input-id');
  assert.equal(account.account_subtype, 'vat_input');
  assert.ok(db.queriedTables.includes('account_mappings'));
  assert.equal(db.queriedTables.includes(LEGACY_MAPPING_TABLE), false);
});

test('resolveGRNIAccount resolves goods_received_not_invoiced and returns account_id = accounts.id', async () => {
  const db = makeDb({
    accountMappings: [{ company_id: COMPANY_ID, mapping_key: 'purchase.grni', account_id: 'acct-grni-id' }],
    accounts: [{
      company_id: COMPANY_ID,
      id: 'acct-grni-id',
      code: '3318',
      name: 'Goods Received Not Invoiced',
      account_type: 'liability',
      account_subtype: 'goods_received_not_invoiced',
    }],
    grniMetadata: [{
      company_id: COMPANY_ID,
      account_id: 'acct-grni-id',
      account_subtype: 'goods_received_not_invoiced',
      requires_party: true,
      default_party_type: 'supplier',
      requires_inventory_item: true,
      requires_warehouse: true,
    }],
  });
  const resolver = new PurchaseAccountResolver({ db });

  const account = await resolver.resolveGRNIAccount(COMPANY_ID, {
    supplierId: 'supplier-1',
    itemId: 'item-1',
    warehouseId: 'warehouse-1',
  });

  assert.equal(account.account_id, 'acct-grni-id');
  assert.equal(account.account_subtype, 'goods_received_not_invoiced');
  assert.equal(REQUIRED_ACCOUNT_SUBTYPES.grni.includes('grni'), false);
});

test('resolver rejects old grni subtype', async () => {
  const db = makeDb({
    accountMappings: [{ company_id: COMPANY_ID, mapping_key: 'purchase.grni', account_id: 'acct-old-grni-id' }],
    accounts: [{
      company_id: COMPANY_ID,
      id: 'acct-old-grni-id',
      code: '3318',
      name: 'Old GRNI',
      account_type: 'liability',
      account_subtype: 'grni',
    }],
  });
  const resolver = new PurchaseAccountResolver({ db });

  await assert.rejects(
    resolver.resolveGRNIAccount(COMPANY_ID, {
      supplierId: 'supplier-1',
      itemId: 'item-1',
      warehouseId: 'warehouse-1',
    }),
    /ACCOUNT_SUBTYPE_INVALID/
  );
});
