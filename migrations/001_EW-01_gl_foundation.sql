-- Migration 001: Core Accounting / GL Foundation
-- EW-01 Targeted Revision v1.0
-- Purpose: publish canonical accounts contract, shared GL posting base,
--          append-only enforcement, and atomic transaction-compatible schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- COMPANIES — canonical company scope root
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    base_currency   CHAR(3) NOT NULL DEFAULT 'VND',
    timezone        VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACCOUNTS — canonical account table contract
-- ============================================================
-- IMPORTANT: `accounts` is the only approved account table name.
-- Physical PK is `accounts.id`. Business payload fields named `account_id`
-- store `accounts.id`. EW-01 does NOT create a physical accounts.account_id
-- column and does NOT create `chart_of_accounts` unless Senior approves a
-- separate compatibility view later.
CREATE TABLE IF NOT EXISTS accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL REFERENCES companies(id),
    code                    VARCHAR(32) NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    account_type            VARCHAR(32) NOT NULL,   -- ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE
    account_subtype         VARCHAR(64) NOT NULL,
    normal_balance          VARCHAR(8) NOT NULL,    -- DEBIT|CREDIT
    is_group                BOOLEAN NOT NULL DEFAULT FALSE,
    parent_id               UUID REFERENCES accounts(id),
    is_postable             BOOLEAN NOT NULL DEFAULT TRUE,
    requires_tax_info       BOOLEAN NOT NULL DEFAULT FALSE,
    requires_inventory_item BOOLEAN NOT NULL DEFAULT FALSE,
    requires_warehouse      BOOLEAN NOT NULL DEFAULT FALSE,
    requires_party          BOOLEAN NOT NULL DEFAULT FALSE,
    default_party_type      VARCHAR(32),
    is_bipolar              BOOLEAN NOT NULL DEFAULT FALSE,
    presentation_rule       VARCHAR(64) NOT NULL DEFAULT 'STANDARD',
    phase_scope             VARCHAR(32) NOT NULL DEFAULT 'BASELINE',
    accounting_regime       VARCHAR(32) NOT NULL DEFAULT 'VAS',
    currency                CHAR(3) NOT NULL DEFAULT 'VND',
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (company_id, code),
    CONSTRAINT accounts_valid_type CHECK (
        account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')
    ),
    CONSTRAINT accounts_valid_subtype CHECK (
        account_subtype IN (
            'cash','bank','receivable','payable','vat_input','vat_output',
            'sales_revenue','purchase_expense','merchandise_inventory',
            'finished_goods','raw_material','tools','cogs',
            'goods_sent_for_sale','goods_received_not_invoiced','equity','retained_earnings',
            'other_asset','other_liability','other_income','other_expense'
        )
    ),
    CONSTRAINT accounts_valid_normal_balance CHECK (normal_balance IN ('DEBIT','CREDIT')),
    CONSTRAINT accounts_valid_default_party_type CHECK (
        default_party_type IS NULL OR default_party_type IN ('CUSTOMER','SUPPLIER','EMPLOYEE','OTHER')
    ),
    CONSTRAINT accounts_group_not_postable CHECK (
        NOT (is_group = TRUE AND is_postable = TRUE)
    )
);

-- Upgrade-safe metadata additions for environments that already applied the
-- earlier targeted revision table definition.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_subtype VARCHAR(64);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS normal_balance VARCHAR(8);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS requires_tax_info BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS requires_inventory_item BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS requires_warehouse BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS requires_party BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS default_party_type VARCHAR(32);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_bipolar BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS presentation_rule VARCHAR(64) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phase_scope VARCHAR(32) NOT NULL DEFAULT 'BASELINE';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS accounting_regime VARCHAR(32) NOT NULL DEFAULT 'VAS';

-- Round 3 hotfix: canonical receipt-before-invoice subtype is
-- `goods_received_not_invoiced`. No legacy compatibility alias is published.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_valid_subtype;
ALTER TABLE accounts ADD CONSTRAINT accounts_valid_subtype CHECK (
    account_subtype IN (
        'cash','bank','receivable','payable','vat_input','vat_output',
        'sales_revenue','purchase_expense','merchandise_inventory',
        'finished_goods','raw_material','tools','cogs',
        'goods_sent_for_sale','goods_received_not_invoiced','equity','retained_earnings',
        'other_asset','other_liability','other_income','other_expense'
    )
);

-- Account mapping contract for module-specific resolver overrides. This table
-- maps resolver dimensions to `accounts.id`; it is not an accounts.account_id
-- alias and does not replace the canonical accounts table.
CREATE TABLE IF NOT EXISTS account_mappings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES companies(id),
    account_subtype     VARCHAR(64) NOT NULL,
    account_id          UUID NOT NULL REFERENCES accounts(id),
    payment_method      VARCHAR(64),
    party_type          VARCHAR(32),
    party_id            UUID,
    item_id             UUID,
    warehouse_id        UUID,
    is_default          BOOLEAN NOT NULL DEFAULT FALSE,
    priority            INTEGER NOT NULL DEFAULT 100,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT account_mappings_valid_party_type CHECK (
        party_type IS NULL OR party_type IN ('CUSTOMER','SUPPLIER','EMPLOYEE','OTHER')
    )
);

CREATE INDEX IF NOT EXISTS idx_account_mappings_resolver
    ON account_mappings (company_id, account_subtype, is_active, priority);

-- ============================================================
-- FISCAL PERIODS
-- ============================================================
CREATE TABLE IF NOT EXISTS fiscal_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    name            VARCHAR(64) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (company_id, start_date, end_date),
    CONSTRAINT fiscal_period_valid_range CHECK (start_date <= end_date)
);

-- ============================================================
-- JOURNAL ENTRIES — accounting document header
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL REFERENCES companies(id),
    entry_number            VARCHAR(64),
    posting_date            DATE NOT NULL,
    description             TEXT,
    status                  VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
                            -- DRAFT | POSTED | CANCELLED
    source_document_type    VARCHAR(64),
    source_document_id      UUID,
    source_document_no      VARCHAR(128),
    idempotency_key         VARCHAR(255),
    reversal_of_id          UUID REFERENCES journal_entries(id),
    reversed_by_id          UUID REFERENCES journal_entries(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT journal_entries_valid_status CHECK (status IN ('DRAFT','POSTED','CANCELLED'))
);

-- Idempotency is company-scoped. Multiple NULLs are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS ux_je_company_idempotency
    ON journal_entries (company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- JOURNAL ENTRY LINES — balanced accounting lines
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id            UUID NOT NULL REFERENCES journal_entries(id),
    company_id                  UUID NOT NULL REFERENCES companies(id),
    account_id                  UUID NOT NULL REFERENCES accounts(id),
    debit_amount                BIGINT NOT NULL DEFAULT 0,   -- VND integer minor unit contract
    credit_amount               BIGINT NOT NULL DEFAULT 0,
    currency                    CHAR(3) NOT NULL DEFAULT 'VND',
    description                 TEXT,
    source_document_type        VARCHAR(64),
    source_document_id          UUID,
    source_document_no          VARCHAR(128),
    source_document_line_id     UUID,
    party_type                  VARCHAR(32),  -- CUSTOMER|SUPPLIER|EMPLOYEE|OTHER
    party_id                    UUID,
    warehouse_id                UUID,
    inventory_item_id           UUID,
    inventory_ledger_entry_id   UUID,
    tax_metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT je_lines_non_negative_amounts CHECK (debit_amount >= 0 AND credit_amount >= 0),
    CONSTRAINT je_lines_one_side_only CHECK (NOT (debit_amount > 0 AND credit_amount > 0)),
    CONSTRAINT je_lines_non_zero_side CHECK (debit_amount > 0 OR credit_amount > 0)
);

-- ============================================================
-- GL ENTRIES — append-only source of truth
-- ============================================================
CREATE TABLE IF NOT EXISTS gl_entries (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                  UUID NOT NULL REFERENCES companies(id),
    journal_entry_id            UUID NOT NULL REFERENCES journal_entries(id),
    journal_entry_line_id       UUID NOT NULL REFERENCES journal_entry_lines(id),
    account_id                  UUID NOT NULL REFERENCES accounts(id),
    posting_date                DATE NOT NULL,
    debit_amount                BIGINT NOT NULL DEFAULT 0,
    credit_amount               BIGINT NOT NULL DEFAULT 0,
    currency                    CHAR(3) NOT NULL DEFAULT 'VND',
    source_document_type        VARCHAR(64),
    source_document_id          UUID,
    source_document_no          VARCHAR(128),
    source_document_line_id     UUID,
    party_type                  VARCHAR(32),
    party_id                    UUID,
    warehouse_id                UUID,
    inventory_item_id           UUID,
    inventory_ledger_entry_id   UUID,
    tax_metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key             VARCHAR(255),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT gl_entries_non_negative_amounts CHECK (debit_amount >= 0 AND credit_amount >= 0),
    CONSTRAINT gl_entries_one_side_only CHECK (NOT (debit_amount > 0 AND credit_amount > 0)),
    CONSTRAINT gl_entries_non_zero_side CHECK (debit_amount > 0 OR credit_amount > 0)
    -- NO updated_at: GL is append-only.
);

-- Upgrade-safe line metadata additions required by account metadata validators.
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS inventory_item_id UUID;
ALTER TABLE gl_entries ADD COLUMN IF NOT EXISTS inventory_item_id UUID;

-- ============================================================
-- APPEND-ONLY ENFORCEMENT via triggers that raise explicit errors
-- ============================================================

-- Remove previous silent append-only rules if this migration is applied over
-- the earlier EW-01 package. Triggers below fail loudly instead of silently
-- ignoring writes.
DROP RULE IF EXISTS gl_entries_no_update ON gl_entries;
DROP RULE IF EXISTS gl_entries_no_delete ON gl_entries;

CREATE OR REPLACE FUNCTION ew01_forbid_gl_entries_update_delete()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'gl_entries is append-only: UPDATE is not allowed';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'gl_entries is append-only: DELETE is not allowed';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gl_entries_no_update ON gl_entries;
CREATE TRIGGER trg_gl_entries_no_update
    BEFORE UPDATE ON gl_entries
    FOR EACH ROW EXECUTE FUNCTION ew01_forbid_gl_entries_update_delete();

DROP TRIGGER IF EXISTS trg_gl_entries_no_delete ON gl_entries;
CREATE TRIGGER trg_gl_entries_no_delete
    BEFORE DELETE ON gl_entries
    FOR EACH ROW EXECUTE FUNCTION ew01_forbid_gl_entries_update_delete();

CREATE OR REPLACE FUNCTION ew01_guard_posted_journal_entry_delete()
RETURNS trigger AS $$
BEGIN
    IF OLD.status IN ('POSTED','CANCELLED') THEN
        RAISE EXCEPTION 'posted/cancelled journal_entries cannot be deleted; reverse instead';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posted_journal_entries_no_delete ON journal_entries;
CREATE TRIGGER trg_posted_journal_entries_no_delete
    BEFORE DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION ew01_guard_posted_journal_entry_delete();

CREATE OR REPLACE FUNCTION ew01_guard_posted_journal_entry_lines()
RETURNS trigger AS $$
DECLARE
    parent_status VARCHAR(16);
BEGIN
    IF TG_OP = 'UPDATE' THEN
        SELECT status INTO parent_status FROM journal_entries WHERE id = OLD.journal_entry_id;
        IF parent_status IN ('POSTED','CANCELLED') THEN
            RAISE EXCEPTION 'journal_entry_lines for posted/cancelled entries are immutable; reverse instead';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        SELECT status INTO parent_status FROM journal_entries WHERE id = OLD.journal_entry_id;
        IF parent_status IN ('POSTED','CANCELLED') THEN
            RAISE EXCEPTION 'journal_entry_lines for posted/cancelled entries cannot be deleted; reverse instead';
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posted_journal_entry_lines_no_update ON journal_entry_lines;
CREATE TRIGGER trg_posted_journal_entry_lines_no_update
    BEFORE UPDATE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION ew01_guard_posted_journal_entry_lines();

DROP TRIGGER IF EXISTS trg_posted_journal_entry_lines_no_delete ON journal_entry_lines;
CREATE TRIGGER trg_posted_journal_entry_lines_no_delete
    BEFORE DELETE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION ew01_guard_posted_journal_entry_lines();

CREATE OR REPLACE FUNCTION ew01_guard_posted_journal_entry_header_update()
RETURNS trigger AS $$
BEGIN
    IF OLD.status IN ('POSTED','CANCELLED') THEN
        IF NEW.company_id IS DISTINCT FROM OLD.company_id
           OR NEW.posting_date IS DISTINCT FROM OLD.posting_date
           OR NEW.source_document_type IS DISTINCT FROM OLD.source_document_type
           OR NEW.source_document_id IS DISTINCT FROM OLD.source_document_id
           OR NEW.source_document_no IS DISTINCT FROM OLD.source_document_no
           OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
           OR NEW.reversal_of_id IS DISTINCT FROM OLD.reversal_of_id THEN
            RAISE EXCEPTION 'posted/cancelled journal_entries financial/source identity fields are immutable; reverse instead';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posted_journal_entries_guard_update ON journal_entries;
CREATE TRIGGER trg_posted_journal_entries_guard_update
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION ew01_guard_posted_journal_entry_header_update();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_gl_company_date
    ON gl_entries (company_id, posting_date);

CREATE INDEX IF NOT EXISTS idx_gl_account
    ON gl_entries (account_id);

CREATE INDEX IF NOT EXISTS idx_gl_source_doc
    ON gl_entries (company_id, source_document_type, source_document_id);

CREATE INDEX IF NOT EXISTS idx_gl_idempotency
    ON gl_entries (company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_je_company_date
    ON journal_entries (company_id, posting_date);

CREATE INDEX IF NOT EXISTS idx_je_source_doc
    ON journal_entries (company_id, source_document_type, source_document_id);

CREATE INDEX IF NOT EXISTS idx_accounts_company_code
    ON accounts (company_id, code);

CREATE INDEX IF NOT EXISTS idx_accounts_company_subtype
    ON accounts (company_id, account_subtype)
    WHERE is_active = TRUE AND is_postable = TRUE;

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_company
    ON fiscal_periods (company_id, start_date, end_date);
