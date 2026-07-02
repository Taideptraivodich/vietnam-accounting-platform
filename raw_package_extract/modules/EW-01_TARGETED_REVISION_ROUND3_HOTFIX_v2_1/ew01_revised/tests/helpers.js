'use strict';

const { randomUUID } = require('crypto');

class MockDb {
  constructor() {
    this.tables = {
      companies: [],
      accounts: [],
      account_mappings: [],
      fiscal_periods: [],
      journal_entries: [],
      journal_entry_lines: [],
      gl_entries: [],
    };
    this.transactionLog = [];
  }

  async query(sql, params = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (/^BEGIN$|^COMMIT$|^ROLLBACK$/.test(normalized)) {
      this.transactionLog.push(normalized);
      return { rows: [] };
    }

    if (/^UPDATE gl_entries/i.test(normalized) || /^DELETE FROM gl_entries/i.test(normalized)) {
      throw new Error('gl_entries is append-only');
    }

    if (/FROM account_mappings m JOIN accounts a/i.test(normalized)) {
      const [companyId, accountSubtype, paymentMethod, partyType, partyId, itemId, warehouseId] = params;
      const mappings = this.tables.account_mappings
        .filter(m => m.company_id === companyId &&
          m.account_subtype === accountSubtype &&
          m.is_active !== false &&
          (m.payment_method == null || m.payment_method === paymentMethod) &&
          (m.party_type == null || m.party_type === partyType) &&
          (m.party_id == null || m.party_id === partyId) &&
          (m.item_id == null || m.item_id === itemId) &&
          (m.warehouse_id == null || m.warehouse_id === warehouseId))
        .sort((a, b) => (a.priority - b.priority) || Number(b.is_default) - Number(a.is_default) || String(a.created_at).localeCompare(String(b.created_at)));
      const rows = [];
      for (const mapping of mappings) {
        const account = this.tables.accounts.find(a => a.company_id === companyId && a.id === mapping.account_id && a.is_active === true && a.is_postable === true);
        if (account) rows.push(account);
      }
      return { rows: rows.slice(0, 1) };
    }

    if (/SELECT \* FROM accounts/i.test(normalized)) {
      let rows = [...this.tables.accounts];
      if (/company_id = \$1 AND id = \$2/i.test(normalized)) {
        rows = rows.filter(r => r.company_id === params[0] && r.id === params[1] && r.is_active === true);
      } else if (/company_id = \$1 AND code = \$2/i.test(normalized)) {
        rows = rows.filter(r => r.company_id === params[0] && r.code === params[1] && r.is_active === true);
      } else if (/company_id = \$1 AND account_subtype = \$2/i.test(normalized)) {
        rows = rows
          .filter(r => r.company_id === params[0] && r.account_subtype === params[1] && r.is_active === true && r.is_postable === true)
          .sort((a, b) => String(a.code).localeCompare(String(b.code)))
          .slice(0, 1);
      }
      return { rows };
    }

    if (/SELECT \* FROM fiscal_periods/i.test(normalized)) {
      const rows = this.tables.fiscal_periods.filter(p =>
        p.company_id === params[0] && p.start_date <= params[1] && p.end_date >= params[1]
      );
      return { rows };
    }

    if (/INSERT INTO journal_entries/i.test(normalized)) {
      const je = {
        id: randomUUID(),
        company_id: params[0],
        posting_date: params[1],
        description: params[2],
        status: params[3] || 'DRAFT',
        source_document_type: params[4],
        source_document_id: params[5],
        source_document_no: params[6],
        idempotency_key: params[7],
        reversal_of_id: params[8] || null,
        reversed_by_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.tables.journal_entries.push(je);
      return { rows: [je] };
    }

    if (/SELECT \* FROM journal_entries WHERE company_id = \$1 AND id = \$2/i.test(normalized)) {
      return { rows: this.tables.journal_entries.filter(r => r.company_id === params[0] && r.id === params[1]) };
    }

    if (/SELECT \* FROM journal_entries WHERE company_id = \$1 AND idempotency_key = \$2/i.test(normalized)) {
      return { rows: this.tables.journal_entries.filter(r => r.company_id === params[0] && r.idempotency_key === params[1]) };
    }

    if (/SELECT \* FROM journal_entries WHERE company_id = \$1 AND source_document_type = \$2 AND source_document_id = \$3 AND status = 'POSTED'/i.test(normalized)) {
      const rows = this.tables.journal_entries
        .filter(r => r.company_id === params[0] && r.source_document_type === params[1] && r.source_document_id === params[2] && r.status === 'POSTED')
        .sort((a, b) => b.created_at - a.created_at);
      return { rows: rows.slice(0, 1) };
    }

    if (/UPDATE journal_entries SET status = \$1/i.test(normalized)) {
      const je = this.tables.journal_entries.find(r => r.company_id === params[1] && r.id === params[2]);
      if (je) { je.status = params[0]; je.updated_at = new Date(); }
      return { rows: je ? [je] : [] };
    }

    if (/UPDATE journal_entries SET reversal_of_id = \$1/i.test(normalized)) {
      const je = this.tables.journal_entries.find(r => r.company_id === params[1] && r.id === params[2]);
      if (je) { je.reversal_of_id = params[0]; je.updated_at = new Date(); }
      return { rows: je ? [je] : [] };
    }

    if (/UPDATE journal_entries SET reversed_by_id = \$1/i.test(normalized)) {
      const je = this.tables.journal_entries.find(r => r.company_id === params[1] && r.id === params[2]);
      if (je) { je.reversed_by_id = params[0]; je.status = 'CANCELLED'; je.updated_at = new Date(); }
      return { rows: je ? [je] : [] };
    }

    if (/UPDATE journal_entries SET posting_date = \$1/i.test(normalized)) {
      const je = this.tables.journal_entries.find(r => r.company_id === params[6] && r.id === params[7]);
      if (je) {
        je.posting_date = params[0];
        je.description = params[1];
        je.source_document_type = params[2];
        je.source_document_id = params[3];
        je.source_document_no = params[4];
        je.idempotency_key = params[5];
        je.updated_at = new Date();
      }
      return { rows: je ? [je] : [] };
    }

    if (/INSERT INTO journal_entry_lines/i.test(normalized)) {
      const line = {
        id: randomUUID(),
        journal_entry_id: params[0],
        company_id: params[1],
        account_id: params[2],
        debit_amount: params[3] || 0,
        credit_amount: params[4] || 0,
        currency: params[5] || 'VND',
        description: params[6],
        source_document_type: params[7],
        source_document_id: params[8],
        source_document_no: params[9],
        source_document_line_id: params[10],
        party_type: params[11],
        party_id: params[12],
        warehouse_id: params[13],
        inventory_item_id: params[14],
        inventory_ledger_entry_id: params[15],
        tax_metadata: params[16] || {},
        created_at: new Date(),
      };
      this.tables.journal_entry_lines.push(line);
      return { rows: [line] };
    }

    if (/SELECT \* FROM journal_entry_lines WHERE journal_entry_id = \$1/i.test(normalized)) {
      return { rows: this.tables.journal_entry_lines.filter(r => r.journal_entry_id === params[0]) };
    }

    if (/DELETE FROM journal_entry_lines WHERE journal_entry_id = \$1/i.test(normalized)) {
      const parent = this.tables.journal_entries.find(j => j.id === params[0]);
      if (parent && (parent.status === 'POSTED' || parent.status === 'CANCELLED')) {
        throw new Error('journal_entry_lines for posted/cancelled entries cannot be deleted');
      }
      this.tables.journal_entry_lines = this.tables.journal_entry_lines.filter(r => r.journal_entry_id !== params[0]);
      return { rows: [] };
    }

    if (/INSERT INTO gl_entries/i.test(normalized)) {
      const entry = {
        id: randomUUID(),
        company_id: params[0],
        journal_entry_id: params[1],
        journal_entry_line_id: params[2],
        account_id: params[3],
        posting_date: params[4],
        debit_amount: params[5] || 0,
        credit_amount: params[6] || 0,
        currency: params[7] || 'VND',
        source_document_type: params[8],
        source_document_id: params[9],
        source_document_no: params[10],
        source_document_line_id: params[11],
        party_type: params[12],
        party_id: params[13],
        warehouse_id: params[14],
        inventory_item_id: params[15],
        inventory_ledger_entry_id: params[16],
        tax_metadata: params[17] || {},
        idempotency_key: params[18],
        created_at: new Date(),
      };
      this.tables.gl_entries.push(entry);
      return { rows: [entry] };
    }

    if (/SELECT \* FROM gl_entries WHERE company_id = \$1 AND idempotency_key = \$2/i.test(normalized)) {
      return { rows: this.tables.gl_entries.filter(r => r.company_id === params[0] && r.idempotency_key === params[1]) };
    }

    if (/SELECT \* FROM gl_entries WHERE company_id = \$1 AND journal_entry_id = \$2/i.test(normalized)) {
      return { rows: this.tables.gl_entries.filter(r => r.company_id === params[0] && r.journal_entry_id === params[1]) };
    }

    if (/SELECT \* FROM gl_entries WHERE company_id = \$1 AND posting_date BETWEEN \$2 AND \$3/i.test(normalized)) {
      return { rows: this.tables.gl_entries.filter(r => r.company_id === params[0] && r.posting_date >= params[1] && r.posting_date <= params[2]) };
    }

    if (/SELECT \* FROM gl_entries WHERE company_id = \$1 AND account_id = \$2/i.test(normalized)) {
      return { rows: this.tables.gl_entries.filter(r => r.company_id === params[0] && r.account_id === params[1] && r.posting_date >= params[2] && r.posting_date <= params[3]) };
    }

    if (/SUM\(debit_amount\)/i.test(normalized)) {
      const filtered = this.tables.gl_entries.filter(r => r.company_id === params[0] && r.posting_date >= params[1] && r.posting_date <= params[2]);
      const map = {};
      for (const e of filtered) {
        if (!map[e.account_id]) map[e.account_id] = { total_debit: 0n, total_credit: 0n };
        map[e.account_id].total_debit += BigInt(e.debit_amount);
        map[e.account_id].total_credit += BigInt(e.credit_amount);
      }
      return { rows: Object.entries(map).map(([account_id, v]) => ({ account_id, total_debit: v.total_debit.toString(), total_credit: v.total_credit.toString() })) };
    }

    console.warn('[MockDb] Unhandled SQL:', normalized);
    return { rows: [] };
  }

  async connect() {
    return {
      query: (...args) => this.query(...args),
      release: () => {},
    };
  }
}

function seedCompany(db, override = {}) {
  const company = {
    id: override.id || randomUUID(),
    code: override.code || `CO-${Math.random().toString(36).slice(2, 8)}`,
    name: override.name || 'Test Company',
    base_currency: override.base_currency || 'VND',
    timezone: override.timezone || 'Asia/Ho_Chi_Minh',
    is_active: override.is_active ?? true,
  };
  db.tables.companies.push(company);
  return company;
}

function seedAccount(db, override = {}) {
  const acc = {
    id: override.id || randomUUID(),
    company_id: override.company_id || randomUUID(),
    code: override.code || '1111',
    name: override.name || 'Cash',
    account_type: override.account_type || 'ASSET',
    account_subtype: override.account_subtype || 'cash',
    normal_balance: override.normal_balance || (override.account_type === 'LIABILITY' || override.account_type === 'EQUITY' || override.account_type === 'REVENUE' ? 'CREDIT' : 'DEBIT'),
    is_group: override.is_group ?? false,
    is_postable: override.is_postable ?? true,
    requires_tax_info: override.requires_tax_info ?? false,
    requires_inventory_item: override.requires_inventory_item ?? false,
    requires_party: override.requires_party ?? false,
    requires_warehouse: override.requires_warehouse ?? false,
    default_party_type: override.default_party_type ?? null,
    is_bipolar: override.is_bipolar ?? false,
    presentation_rule: override.presentation_rule || 'STANDARD',
    phase_scope: override.phase_scope || 'BASELINE',
    accounting_regime: override.accounting_regime || 'VAS',
    currency: override.currency || 'VND',
    is_active: override.is_active ?? true,
  };
  db.tables.accounts.push(acc);
  return acc;
}

function seedPeriod(db, override = {}) {
  const period = {
    id: override.id || randomUUID(),
    company_id: override.company_id || randomUUID(),
    name: override.name || '2024-01',
    start_date: override.start_date || '2024-01-01',
    end_date: override.end_date || '2024-01-31',
    is_locked: override.is_locked ?? false,
  };
  db.tables.fiscal_periods.push(period);
  return period;
}


function seedAccountMapping(db, override = {}) {
  const mapping = {
    id: override.id || randomUUID(),
    company_id: override.company_id || randomUUID(),
    account_subtype: override.account_subtype || 'cash',
    account_id: override.account_id,
    payment_method: override.payment_method ?? null,
    party_type: override.party_type ?? null,
    party_id: override.party_id ?? null,
    item_id: override.item_id ?? null,
    warehouse_id: override.warehouse_id ?? null,
    is_default: override.is_default ?? false,
    priority: override.priority ?? 100,
    is_active: override.is_active ?? true,
    created_at: override.created_at || new Date(),
  };
  db.tables.account_mappings.push(mapping);
  return mapping;
}

module.exports = { MockDb, seedCompany, seedAccount, seedAccountMapping, seedPeriod, randomUUID };
