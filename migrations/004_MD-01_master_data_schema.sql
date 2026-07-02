-- MD-01 Master Data Baseline P0 v1.0
-- Scope: customers, suppliers, items, warehouses only.
-- Assumptions: companies(id) and accounts(id) already exist from approved upstream packages.

BEGIN;

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT customers_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT customers_company_code_unique UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT suppliers_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT suppliers_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT suppliers_company_code_unique UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT warehouses_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT warehouses_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT warehouses_company_code_unique UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    is_stock_item BOOLEAN NOT NULL DEFAULT FALSE,
    inventory_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    cogs_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    revenue_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    expense_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT items_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT items_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT items_type_not_blank CHECK (btrim(item_type) <> ''),
    CONSTRAINT items_stock_accounts_required CHECK (
        is_stock_item = FALSE OR (
            inventory_account_id IS NOT NULL
            AND cogs_account_id IS NOT NULL
            AND revenue_account_id IS NOT NULL
            AND expense_account_id IS NOT NULL
        )
    ),
    CONSTRAINT items_company_code_unique UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_active ON suppliers(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_company_active ON warehouses(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_items_company_active ON items(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_items_company_stock ON items(company_id, is_stock_item);

COMMENT ON TABLE customers IS 'MD-01 P0 baseline only. No CRM behavior.';
COMMENT ON TABLE suppliers IS 'MD-01 P0 baseline only. No vendor-management behavior.';
COMMENT ON TABLE warehouses IS 'MD-01 P0 baseline only. No hierarchy/bin/advanced warehouse behavior.';
COMMENT ON TABLE items IS 'MD-01 P0 baseline only.';

COMMIT;
