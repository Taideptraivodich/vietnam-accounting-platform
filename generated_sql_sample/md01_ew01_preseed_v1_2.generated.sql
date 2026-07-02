\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep ''
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog, public;

-- MD01/EW01 deterministic local preseed v1.2.
-- Verification failures are named with MD01_PRESEED_VERIFY_FAILED[...] errors.
CREATE TEMP TABLE md01_preseed_ids (
    key text PRIMARY KEY,
    value uuid NOT NULL
) ON COMMIT PRESERVE ROWS;

CREATE OR REPLACE FUNCTION pg_temp.md01_preseed_assert(passed boolean, check_name text, details text)
RETURNS void
LANGUAGE plpgsql
AS $assert$
BEGIN
    IF NOT COALESCE(passed, false) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = format('MD01_PRESEED_VERIFY_FAILED[%s]: %s', check_name, details);
    END IF;
END
$assert$;

-- Create/select deterministic local integration company baseline.
WITH pre_existing AS (
    SELECT id FROM "public"."companies" WHERE code = 'MD01LOCAL' ORDER BY id::text LIMIT 1
), ins AS (
    INSERT INTO "public"."companies" (code, name, is_active, created_at, updated_at)
    SELECT 'MD01LOCAL', 'MD01 Local Integration Co', true, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)
    ON CONFLICT DO NOTHING
    RETURNING id
), post_existing AS (
    SELECT id FROM "public"."companies" WHERE code = 'MD01LOCAL' ORDER BY id::text LIMIT 1
)
INSERT INTO md01_preseed_ids(key, value)
SELECT 'company_id', COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create/select deterministic inventory account baseline.
WITH pre_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '156'
    ORDER BY id::text LIMIT 1
), ins AS (
    INSERT INTO "public"."accounts" (
        company_id, code, name, account_type, account_subtype, normal_balance,
        currency, is_active, is_group, is_postable, created_at, updated_at
    )
    SELECT
        (SELECT value FROM md01_preseed_ids WHERE key = 'company_id'),
        '156',
        'MD01 Inventory Asset Account',
        'ASSET',
        'merchandise_inventory',
        'DEBIT',
        'VND',
        true, false, true, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)
    ON CONFLICT DO NOTHING
    RETURNING id
), post_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '156'
    ORDER BY id::text LIMIT 1
)
INSERT INTO md01_preseed_ids(key, value)
SELECT 'inventory_account_id', COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create/select deterministic cogs account baseline.
WITH pre_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '632'
    ORDER BY id::text LIMIT 1
), ins AS (
    INSERT INTO "public"."accounts" (
        company_id, code, name, account_type, account_subtype, normal_balance,
        currency, is_active, is_group, is_postable, created_at, updated_at
    )
    SELECT
        (SELECT value FROM md01_preseed_ids WHERE key = 'company_id'),
        '632',
        'MD01 Cost of Goods Sold Account',
        'EXPENSE',
        'cogs',
        'DEBIT',
        'VND',
        true, false, true, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)
    ON CONFLICT DO NOTHING
    RETURNING id
), post_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '632'
    ORDER BY id::text LIMIT 1
)
INSERT INTO md01_preseed_ids(key, value)
SELECT 'cogs_account_id', COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create/select deterministic revenue account baseline.
WITH pre_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '511'
    ORDER BY id::text LIMIT 1
), ins AS (
    INSERT INTO "public"."accounts" (
        company_id, code, name, account_type, account_subtype, normal_balance,
        currency, is_active, is_group, is_postable, created_at, updated_at
    )
    SELECT
        (SELECT value FROM md01_preseed_ids WHERE key = 'company_id'),
        '511',
        'MD01 Sales Revenue Account',
        'REVENUE',
        'sales_revenue',
        'CREDIT',
        'VND',
        true, false, true, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)
    ON CONFLICT DO NOTHING
    RETURNING id
), post_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '511'
    ORDER BY id::text LIMIT 1
)
INSERT INTO md01_preseed_ids(key, value)
SELECT 'revenue_account_id', COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create/select deterministic expense account baseline.
WITH pre_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '642'
    ORDER BY id::text LIMIT 1
), ins AS (
    INSERT INTO "public"."accounts" (
        company_id, code, name, account_type, account_subtype, normal_balance,
        currency, is_active, is_group, is_postable, created_at, updated_at
    )
    SELECT
        (SELECT value FROM md01_preseed_ids WHERE key = 'company_id'),
        '642',
        'MD01 Purchase Expense Fallback Account',
        'EXPENSE',
        'purchase_expense',
        'DEBIT',
        'VND',
        true, false, true, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)
    ON CONFLICT DO NOTHING
    RETURNING id
), post_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '642'
    ORDER BY id::text LIMIT 1
)
INSERT INTO md01_preseed_ids(key, value)
SELECT 'expense_account_id', COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create/select deterministic grni account baseline.
WITH pre_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '3318'
    ORDER BY id::text LIMIT 1
), ins AS (
    INSERT INTO "public"."accounts" (
        company_id, code, name, account_type, account_subtype, normal_balance,
        currency, is_active, is_group, is_postable, created_at, updated_at
    )
    SELECT
        (SELECT value FROM md01_preseed_ids WHERE key = 'company_id'),
        '3318',
        'MD01 Goods Received Not Invoiced Account',
        'LIABILITY',
        'goods_received_not_invoiced',
        'CREDIT',
        'VND',
        true, false, true, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM pre_existing)
    ON CONFLICT DO NOTHING
    RETURNING id
), post_existing AS (
    SELECT id FROM "public"."accounts"
    WHERE company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id') AND code = '3318'
    ORDER BY id::text LIMIT 1
)
INSERT INTO md01_preseed_ids(key, value)
SELECT 'grni_account_id', COALESCE((SELECT id FROM pre_existing), (SELECT id FROM ins), (SELECT id FROM post_existing))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Named verification block. No division-by-zero sentinels are used.
DO $verify$
BEGIN
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."companies" c JOIN md01_preseed_ids i ON i.key = 'company_id' AND i.value = c.id WHERE c.code = 'MD01LOCAL'),
        'company.exists',
        'companies must contain code MD01LOCAL'
    );
    PERFORM pg_temp.md01_preseed_assert(
        (SELECT value::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' FROM md01_preseed_ids WHERE key = 'company_id'),
        'company.uuid',
        'MD01_COMPANY_ID must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'
    );

    -- Verify inventory account baseline.
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id),
        'inventory.exists',
        'MD01_INVENTORY_ACCOUNT_ID must resolve to an accounts row for code 156'
    );
    PERFORM pg_temp.md01_preseed_assert(
        (SELECT value::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' FROM md01_preseed_ids WHERE key = 'inventory_account_id'),
        'inventory.uuid',
        'MD01_INVENTORY_ACCOUNT_ID must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id WHERE a.company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id')),
        'inventory.company_id',
        'MD01_INVENTORY_ACCOUNT_ID must belong to MD01LOCAL company_id'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id WHERE a.code = '156'),
        'inventory.code',
        'MD01_INVENTORY_ACCOUNT_ID must use account code 156'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id WHERE a.account_type = 'ASSET'),
        'inventory.account_type',
        'MD01_INVENTORY_ACCOUNT_ID must have account_type=ASSET'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id WHERE a.account_subtype = 'merchandise_inventory'),
        'inventory.account_subtype',
        'MD01_INVENTORY_ACCOUNT_ID must have non-null account_subtype=merchandise_inventory'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id WHERE a.normal_balance = 'DEBIT'),
        'inventory.normal_balance',
        'MD01_INVENTORY_ACCOUNT_ID must have normal_balance=DEBIT'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id WHERE a.currency = 'VND'),
        'inventory.currency',
        'MD01_INVENTORY_ACCOUNT_ID must have currency=VND'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'inventory_account_id' AND i.value = a.id WHERE a.is_active IS TRUE),
        'inventory.is_active',
        'MD01_INVENTORY_ACCOUNT_ID must be active'
    );

    -- Verify cogs account baseline.
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id),
        'cogs.exists',
        'MD01_COGS_ACCOUNT_ID must resolve to an accounts row for code 632'
    );
    PERFORM pg_temp.md01_preseed_assert(
        (SELECT value::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' FROM md01_preseed_ids WHERE key = 'cogs_account_id'),
        'cogs.uuid',
        'MD01_COGS_ACCOUNT_ID must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id WHERE a.company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id')),
        'cogs.company_id',
        'MD01_COGS_ACCOUNT_ID must belong to MD01LOCAL company_id'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id WHERE a.code = '632'),
        'cogs.code',
        'MD01_COGS_ACCOUNT_ID must use account code 632'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id WHERE a.account_type = 'EXPENSE'),
        'cogs.account_type',
        'MD01_COGS_ACCOUNT_ID must have account_type=EXPENSE'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id WHERE a.account_subtype = 'cogs'),
        'cogs.account_subtype',
        'MD01_COGS_ACCOUNT_ID must have non-null account_subtype=cogs'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id WHERE a.normal_balance = 'DEBIT'),
        'cogs.normal_balance',
        'MD01_COGS_ACCOUNT_ID must have normal_balance=DEBIT'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id WHERE a.currency = 'VND'),
        'cogs.currency',
        'MD01_COGS_ACCOUNT_ID must have currency=VND'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'cogs_account_id' AND i.value = a.id WHERE a.is_active IS TRUE),
        'cogs.is_active',
        'MD01_COGS_ACCOUNT_ID must be active'
    );

    -- Verify revenue account baseline.
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id),
        'revenue.exists',
        'MD01_REVENUE_ACCOUNT_ID must resolve to an accounts row for code 511'
    );
    PERFORM pg_temp.md01_preseed_assert(
        (SELECT value::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' FROM md01_preseed_ids WHERE key = 'revenue_account_id'),
        'revenue.uuid',
        'MD01_REVENUE_ACCOUNT_ID must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id WHERE a.company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id')),
        'revenue.company_id',
        'MD01_REVENUE_ACCOUNT_ID must belong to MD01LOCAL company_id'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id WHERE a.code = '511'),
        'revenue.code',
        'MD01_REVENUE_ACCOUNT_ID must use account code 511'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id WHERE a.account_type = 'REVENUE'),
        'revenue.account_type',
        'MD01_REVENUE_ACCOUNT_ID must have account_type=REVENUE'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id WHERE a.account_subtype = 'sales_revenue'),
        'revenue.account_subtype',
        'MD01_REVENUE_ACCOUNT_ID must have non-null account_subtype=sales_revenue'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id WHERE a.normal_balance = 'CREDIT'),
        'revenue.normal_balance',
        'MD01_REVENUE_ACCOUNT_ID must have normal_balance=CREDIT'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id WHERE a.currency = 'VND'),
        'revenue.currency',
        'MD01_REVENUE_ACCOUNT_ID must have currency=VND'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'revenue_account_id' AND i.value = a.id WHERE a.is_active IS TRUE),
        'revenue.is_active',
        'MD01_REVENUE_ACCOUNT_ID must be active'
    );

    -- Verify expense account baseline.
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id),
        'expense.exists',
        'MD01_EXPENSE_ACCOUNT_ID must resolve to an accounts row for code 642'
    );
    PERFORM pg_temp.md01_preseed_assert(
        (SELECT value::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' FROM md01_preseed_ids WHERE key = 'expense_account_id'),
        'expense.uuid',
        'MD01_EXPENSE_ACCOUNT_ID must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id WHERE a.company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id')),
        'expense.company_id',
        'MD01_EXPENSE_ACCOUNT_ID must belong to MD01LOCAL company_id'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id WHERE a.code = '642'),
        'expense.code',
        'MD01_EXPENSE_ACCOUNT_ID must use account code 642'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id WHERE a.account_type = 'EXPENSE'),
        'expense.account_type',
        'MD01_EXPENSE_ACCOUNT_ID must have account_type=EXPENSE'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id WHERE a.account_subtype = 'purchase_expense'),
        'expense.account_subtype',
        'MD01_EXPENSE_ACCOUNT_ID must have non-null account_subtype=purchase_expense'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id WHERE a.normal_balance = 'DEBIT'),
        'expense.normal_balance',
        'MD01_EXPENSE_ACCOUNT_ID must have normal_balance=DEBIT'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id WHERE a.currency = 'VND'),
        'expense.currency',
        'MD01_EXPENSE_ACCOUNT_ID must have currency=VND'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'expense_account_id' AND i.value = a.id WHERE a.is_active IS TRUE),
        'expense.is_active',
        'MD01_EXPENSE_ACCOUNT_ID must be active'
    );

    -- Verify grni account baseline.
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id),
        'grni.exists',
        'MD01_GRNI_ACCOUNT_ID must resolve to an accounts row for code 3318'
    );
    PERFORM pg_temp.md01_preseed_assert(
        (SELECT value::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' FROM md01_preseed_ids WHERE key = 'grni_account_id'),
        'grni.uuid',
        'MD01_GRNI_ACCOUNT_ID must be a canonical PostgreSQL UUID; version/variant are intentionally not restricted'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id WHERE a.company_id = (SELECT value FROM md01_preseed_ids WHERE key = 'company_id')),
        'grni.company_id',
        'MD01_GRNI_ACCOUNT_ID must belong to MD01LOCAL company_id'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id WHERE a.code = '3318'),
        'grni.code',
        'MD01_GRNI_ACCOUNT_ID must use account code 3318'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id WHERE a.account_type = 'LIABILITY'),
        'grni.account_type',
        'MD01_GRNI_ACCOUNT_ID must have account_type=LIABILITY'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id WHERE a.account_subtype = 'goods_received_not_invoiced'),
        'grni.account_subtype',
        'MD01_GRNI_ACCOUNT_ID must have non-null account_subtype=goods_received_not_invoiced'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id WHERE a.normal_balance = 'CREDIT'),
        'grni.normal_balance',
        'MD01_GRNI_ACCOUNT_ID must have normal_balance=CREDIT'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id WHERE a.currency = 'VND'),
        'grni.currency',
        'MD01_GRNI_ACCOUNT_ID must have currency=VND'
    );
    PERFORM pg_temp.md01_preseed_assert(
        EXISTS (SELECT 1 FROM "public"."accounts" a JOIN md01_preseed_ids i ON i.key = 'grni_account_id' AND i.value = a.id WHERE a.is_active IS TRUE),
        'grni.is_active',
        'MD01_GRNI_ACCOUNT_ID must be active'
    );

    PERFORM pg_temp.md01_preseed_assert(
        (SELECT count(DISTINCT value) FROM md01_preseed_ids WHERE key IN ('inventory_account_id','cogs_account_id','revenue_account_id','expense_account_id','grni_account_id')) = 5,
        'accounts.distinct',
        'inventory, COGS, revenue, expense fallback, and GRNI accounts must be five distinct accounts'
    );
END
$verify$;

COMMIT;

-- Clean exportable .env lines consumed by npm run seed:md01 / INT01A.
SELECT env_line FROM (VALUES
  (1, 'MD01_COMPANY_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'company_id')),
  (2, 'MD01_INVENTORY_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'inventory_account_id')),
  (3, 'MD01_COGS_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'cogs_account_id')),
  (4, 'MD01_REVENUE_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'revenue_account_id')),
  (5, 'MD01_EXPENSE_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'expense_account_id')),
  (6, 'MD01_GRNI_ACCOUNT_ID=' || (SELECT value::text FROM md01_preseed_ids WHERE key = 'grni_account_id'))
) AS env(ordering, env_line) ORDER BY ordering;
