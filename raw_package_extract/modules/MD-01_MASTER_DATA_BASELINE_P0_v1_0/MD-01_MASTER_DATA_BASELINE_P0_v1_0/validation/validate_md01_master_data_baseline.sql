-- MD-01 validation script for PostgreSQL / psql.
-- Required psql variables:
--   company_a_id, company_b_id,
--   inventory_account_id, cogs_account_id, revenue_account_id, expense_account_id
-- This script rolls back all validation inserts.

\set ON_ERROR_STOP on

BEGIN;

SELECT set_config('md01.company_a_id', :'company_a_id', TRUE);
SELECT set_config('md01.company_b_id', :'company_b_id', TRUE);

-- 1. Company dependency assertion. Company creation is owned outside MD-01.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = current_setting('md01.company_a_id')::uuid) THEN
    RAISE EXCEPTION 'Required validation company A not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM companies WHERE id = current_setting('md01.company_b_id')::uuid) THEN
    RAISE EXCEPTION 'Required validation company B not found';
  END IF;
END $$;

-- 2. Create customer.
INSERT INTO customers (id, company_id, code, name, is_active)
VALUES ('00000000-0000-4000-9000-000000000101', :'company_a_id', 'VAL-CUST-001', 'Validation Customer A', TRUE);

-- 3. Create supplier.
INSERT INTO suppliers (id, company_id, code, name, is_active)
VALUES ('00000000-0000-4000-9000-000000000201', :'company_a_id', 'VAL-SUP-001', 'Validation Supplier A', TRUE);

-- 4. Create stock item with account mappings by accounts.id values.
INSERT INTO items (
  id, company_id, code, name, item_type, is_stock_item,
  inventory_account_id, cogs_account_id, revenue_account_id, expense_account_id,
  is_active
)
VALUES (
  '00000000-0000-4000-9000-000000000401', :'company_a_id', 'VAL-ITEM-001', 'Validation Stock Item A', 'stock', TRUE,
  :'inventory_account_id', :'cogs_account_id', :'revenue_account_id', :'expense_account_id',
  TRUE
);

-- 5. Create warehouse.
INSERT INTO warehouses (id, company_id, code, name, is_active)
VALUES ('00000000-0000-4000-9000-000000000301', :'company_a_id', 'VAL-WH-001', 'Validation Warehouse A', TRUE);

-- 6. Reject duplicate code per company.
DO $$
BEGIN
  INSERT INTO customers (id, company_id, code, name, is_active)
  VALUES ('00000000-0000-4000-9000-000000000102', current_setting('md01.company_a_id')::uuid, 'VAL-CUST-001', 'Duplicate Customer A', TRUE);
  RAISE EXCEPTION 'Expected duplicate customer code to be rejected';
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- 7. Ensure records are company-scoped: same code is allowed in another company, but queries are isolated by company_id.
INSERT INTO customers (id, company_id, code, name, is_active)
VALUES ('00000000-0000-4000-9000-000000000103', :'company_b_id', 'VAL-CUST-001', 'Validation Customer B', TRUE);

SELECT COUNT(*) AS company_a_customer_count
FROM customers
WHERE company_id = :'company_a_id' AND code = 'VAL-CUST-001';

SELECT COUNT(*) AS company_b_customer_count
FROM customers
WHERE company_id = :'company_b_id' AND code = 'VAL-CUST-001';

ROLLBACK;
