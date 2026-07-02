\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep ''

-- Generic post-preseed verification. Pass variables with -v, for example:
-- psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -v MD01_COMPANY_ID="$MD01_COMPANY_ID" \
--   -v MD01_INVENTORY_ACCOUNT_ID="$MD01_INVENTORY_ACCOUNT_ID" \
--   -v MD01_COGS_ACCOUNT_ID="$MD01_COGS_ACCOUNT_ID" \
--   -v MD01_REVENUE_ACCOUNT_ID="$MD01_REVENUE_ACCOUNT_ID" \
--   -v MD01_EXPENSE_ACCOUNT_ID="$MD01_EXPENSE_ACCOUNT_ID" \
--   -v MD01_GRNI_ACCOUNT_ID="$MD01_GRNI_ACCOUNT_ID" \
--   -f verification/verify_md01_preseed.sql

CREATE OR REPLACE FUNCTION pg_temp.md01_verify_assert(passed boolean, check_name text, details text)
RETURNS text
LANGUAGE plpgsql
AS $assert$
BEGIN
    IF NOT COALESCE(passed, false) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = format('MD01_PRESEED_VERIFY_FAILED[%s]: %s', check_name, details);
    END IF;
    RETURN 'ok';
END
$assert$;

SELECT pg_temp.md01_verify_assert(
    EXISTS (SELECT 1 FROM public.companies WHERE id = :'MD01_COMPANY_ID'::uuid AND code = 'MD01LOCAL' AND is_active IS TRUE),
    'company.exists',
    'MD01_COMPANY_ID must point to active companies.code=MD01LOCAL'
);

SELECT pg_temp.md01_verify_assert(
    EXISTS (SELECT 1 FROM public.accounts WHERE id = :'MD01_INVENTORY_ACCOUNT_ID'::uuid AND company_id = :'MD01_COMPANY_ID'::uuid AND code = '156' AND account_type = 'ASSET' AND account_subtype = 'merchandise_inventory' AND normal_balance = 'DEBIT' AND currency = 'VND' AND is_active IS TRUE),
    'inventory.account_contract',
    'MD01_INVENTORY_ACCOUNT_ID must be code 156 / ASSET / merchandise_inventory / DEBIT / VND / active'
);

SELECT pg_temp.md01_verify_assert(
    EXISTS (SELECT 1 FROM public.accounts WHERE id = :'MD01_COGS_ACCOUNT_ID'::uuid AND company_id = :'MD01_COMPANY_ID'::uuid AND code = '632' AND account_type = 'EXPENSE' AND account_subtype = 'cogs' AND normal_balance = 'DEBIT' AND currency = 'VND' AND is_active IS TRUE),
    'cogs.account_contract',
    'MD01_COGS_ACCOUNT_ID must be code 632 / EXPENSE / cogs / DEBIT / VND / active'
);

SELECT pg_temp.md01_verify_assert(
    EXISTS (SELECT 1 FROM public.accounts WHERE id = :'MD01_REVENUE_ACCOUNT_ID'::uuid AND company_id = :'MD01_COMPANY_ID'::uuid AND code = '511' AND account_type = 'REVENUE' AND account_subtype = 'sales_revenue' AND normal_balance = 'CREDIT' AND currency = 'VND' AND is_active IS TRUE),
    'revenue.account_contract',
    'MD01_REVENUE_ACCOUNT_ID must be code 511 / REVENUE / sales_revenue / CREDIT / VND / active'
);

SELECT pg_temp.md01_verify_assert(
    EXISTS (SELECT 1 FROM public.accounts WHERE id = :'MD01_EXPENSE_ACCOUNT_ID'::uuid AND company_id = :'MD01_COMPANY_ID'::uuid AND code = '642' AND account_type = 'EXPENSE' AND account_subtype = 'purchase_expense' AND normal_balance = 'DEBIT' AND currency = 'VND' AND is_active IS TRUE),
    'expense.account_contract',
    'MD01_EXPENSE_ACCOUNT_ID must be code 642 / EXPENSE / purchase_expense / DEBIT / VND / active'
);

SELECT pg_temp.md01_verify_assert(
    EXISTS (SELECT 1 FROM public.accounts WHERE id = :'MD01_GRNI_ACCOUNT_ID'::uuid AND company_id = :'MD01_COMPANY_ID'::uuid AND code = '3318' AND account_type = 'LIABILITY' AND account_subtype = 'goods_received_not_invoiced' AND normal_balance = 'CREDIT' AND currency = 'VND' AND is_active IS TRUE),
    'grni.account_contract',
    'MD01_GRNI_ACCOUNT_ID must be code 3318 / LIABILITY / goods_received_not_invoiced / CREDIT / VND / active'
);

SELECT pg_temp.md01_verify_assert(
    (SELECT count(DISTINCT id) FROM public.accounts WHERE id IN (:'MD01_INVENTORY_ACCOUNT_ID'::uuid, :'MD01_COGS_ACCOUNT_ID'::uuid, :'MD01_REVENUE_ACCOUNT_ID'::uuid, :'MD01_EXPENSE_ACCOUNT_ID'::uuid, :'MD01_GRNI_ACCOUNT_ID'::uuid)) = 5,
    'accounts.distinct',
    'required MD01 account env vars must identify five distinct account rows'
);

SELECT 'MD01_PRESEED_VERIFY=PASS';
