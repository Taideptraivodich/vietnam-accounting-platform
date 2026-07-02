-- EW-02 Migration 001: AR/AP Monetary Ledger, Allocations, Outstanding Cache
-- Architecture Freeze v1.0
-- All ledger tables are append-only. Application role must NOT UPDATE/DELETE rows.

-- ============================================================
-- AR/AP MONETARY LEDGER
-- Records every AR/AP event (invoice posted, payment posted, reversal)
-- Source of truth for AR/AP position per party.
-- ============================================================
CREATE TABLE ar_ap_ledger_entries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,

    -- Party
    party_type              VARCHAR(20) NOT NULL CHECK (party_type IN ('customer', 'supplier')),
    party_id                UUID NOT NULL,

    -- Entry type
    entry_type              VARCHAR(50) NOT NULL CHECK (entry_type IN (
                                'invoice',          -- sales or purchase invoice posted
                                'credit_note',      -- credit note posted
                                'payment',          -- receipt or payment voucher posted
                                'advance',          -- advance payment/receipt
                                'reversal'          -- cancellation reversal of a prior entry
                            )),

    -- Direction
    -- For AR: debit = amount owed TO us (invoice), credit = amount received / cleared
    -- For AP: credit = amount owed BY us (invoice), debit = amount paid / cleared
    debit_amount            NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount           NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    currency_code           CHAR(3) NOT NULL DEFAULT 'VND',

    -- Source identity (traceability)
    source_document_type    VARCHAR(50) NOT NULL,   -- 'sales_invoice', 'purchase_invoice', 'receipt_voucher', 'payment_voucher'
    source_document_id      UUID NOT NULL,
    source_document_line_id UUID,                   -- nullable, line-level traceability where applicable
    posting_date            DATE NOT NULL,
    accounting_period       CHAR(7) NOT NULL,       -- 'YYYY-MM'

    -- Reversal link
    reverses_entry_id       UUID REFERENCES ar_ap_ledger_entries(id),

    -- Idempotency
    idempotency_key         VARCHAR(255) NOT NULL,

    -- Metadata
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID NOT NULL,

    CONSTRAINT ck_entry_has_amount CHECK (debit_amount > 0 OR credit_amount > 0),
    CONSTRAINT uq_ar_ap_ledger_idempotency UNIQUE (company_id, idempotency_key)
);

CREATE INDEX idx_ar_ap_ledger_company_party ON ar_ap_ledger_entries (company_id, party_type, party_id);
CREATE INDEX idx_ar_ap_ledger_source ON ar_ap_ledger_entries (company_id, source_document_type, source_document_id);
CREATE INDEX idx_ar_ap_ledger_posting_date ON ar_ap_ledger_entries (company_id, posting_date);

-- ============================================================
-- AR/AP ALLOCATIONS
-- Append-only settlement event ledger.
--
-- Chosen senior-approved pattern: Option C. Cancellation is represented
-- by a new negative allocation event that references the original
-- allocation via reversal_of_allocation_id. The original allocation row
-- is never updated or deleted.
-- ============================================================
CREATE TABLE ar_ap_allocations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,

    party_type              VARCHAR(20) NOT NULL CHECK (party_type IN ('customer', 'supplier')),
    party_id                UUID NOT NULL,

    -- What is being settled
    invoice_ledger_entry_id UUID NOT NULL REFERENCES ar_ap_ledger_entries(id),
    payment_ledger_entry_id UUID NOT NULL REFERENCES ar_ap_ledger_entries(id),

    -- Positive for allocation events, negative for cancellation/reversal events.
    allocated_amount        NUMERIC(20,4) NOT NULL,
    currency_code           CHAR(3) NOT NULL DEFAULT 'VND',

    allocation_date         DATE NOT NULL,
    allocation_event_type   VARCHAR(20) NOT NULL DEFAULT 'allocated'
                                CHECK (allocation_event_type IN ('allocated', 'cancelled', 'reversed')),

    -- Cancellation/reversal link. NULL for original allocations.
    reversal_of_allocation_id UUID REFERENCES ar_ap_allocations(id),
    reversal_reason         TEXT,

    -- Idempotency
    idempotency_key         VARCHAR(255) NOT NULL,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID NOT NULL,

    CONSTRAINT uq_ar_ap_allocation_idempotency UNIQUE (company_id, idempotency_key),
    CONSTRAINT ck_allocation_event_amount_direction CHECK (
        (allocation_event_type = 'allocated'
            AND allocated_amount > 0
            AND reversal_of_allocation_id IS NULL)
        OR
        (allocation_event_type IN ('cancelled', 'reversed')
            AND allocated_amount < 0
            AND reversal_of_allocation_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_ar_ap_allocation_single_reversal
    ON ar_ap_allocations (company_id, reversal_of_allocation_id)
    WHERE allocation_event_type IN ('cancelled', 'reversed');

CREATE INDEX idx_ar_ap_alloc_invoice ON ar_ap_allocations (company_id, invoice_ledger_entry_id, allocation_event_type);
CREATE INDEX idx_ar_ap_alloc_payment ON ar_ap_allocations (company_id, payment_ledger_entry_id, allocation_event_type);
CREATE INDEX idx_ar_ap_alloc_reversal ON ar_ap_allocations (company_id, reversal_of_allocation_id);
CREATE INDEX idx_ar_ap_alloc_party ON ar_ap_allocations (company_id, party_type, party_id);


-- ============================================================
-- DB-LEVEL APPEND-ONLY ENFORCEMENT
-- Senior Round 2 P0: AR/AP source-of-truth event tables must reject
-- UPDATE and DELETE at the database layer. Corrections are represented
-- by reversal rows / negative allocation events only.
-- ar_ap_outstanding_cache intentionally remains mutable because it is
-- a rebuildable derived cache, not the accounting source of truth.
-- ============================================================
CREATE OR REPLACE FUNCTION ew02_forbid_ar_ap_append_only_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: % is not allowed. Append a reversal/event row instead.', TG_TABLE_NAME, TG_OP
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ar_ap_ledger_entries_no_update
BEFORE UPDATE ON ar_ap_ledger_entries
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();

CREATE TRIGGER trg_ar_ap_ledger_entries_no_delete
BEFORE DELETE ON ar_ap_ledger_entries
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();

CREATE TRIGGER trg_ar_ap_allocations_no_update
BEFORE UPDATE ON ar_ap_allocations
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();

CREATE TRIGGER trg_ar_ap_allocations_no_delete
BEFORE DELETE ON ar_ap_allocations
FOR EACH ROW EXECUTE FUNCTION ew02_forbid_ar_ap_append_only_mutation();

-- ============================================================
-- OUTSTANDING CACHE (derived, NOT source of truth)
-- Rebuilt from ar_ap_ledger_entries. Used for fast queries.
-- Can be rebuilt at any time from the ledger.
-- ============================================================
CREATE TABLE ar_ap_outstanding_cache (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,

    party_type              VARCHAR(20) NOT NULL CHECK (party_type IN ('customer', 'supplier')),
    party_id                UUID NOT NULL,

    -- Source document that created the outstanding
    source_document_type    VARCHAR(50) NOT NULL,
    source_document_id      UUID NOT NULL,

    original_amount         NUMERIC(20,4) NOT NULL,
    allocated_amount        NUMERIC(20,4) NOT NULL DEFAULT 0,
    outstanding_amount      NUMERIC(20,4) NOT NULL,   -- = original_amount - allocated_amount
    currency_code           CHAR(3) NOT NULL DEFAULT 'VND',

    -- Status
    status                  VARCHAR(20) NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'partial', 'settled', 'cancelled')),

    -- AR/AP ledger entry this cache row tracks
    ar_ap_ledger_entry_id   UUID NOT NULL REFERENCES ar_ap_ledger_entries(id),

    last_updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_outstanding_cache UNIQUE (company_id, source_document_id, source_document_type)
);

CREATE INDEX idx_outstanding_cache_party ON ar_ap_outstanding_cache (company_id, party_type, party_id, status);

-- ============================================================
-- RECEIPT VOUCHER (AR side)
-- ============================================================
CREATE TABLE receipt_vouchers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,

    voucher_number          VARCHAR(50) NOT NULL,
    voucher_date            DATE NOT NULL,
    accounting_period       CHAR(7) NOT NULL,

    customer_id             UUID NOT NULL,
    received_amount         NUMERIC(20,4) NOT NULL CHECK (received_amount > 0),
    currency_code           CHAR(3) NOT NULL DEFAULT 'VND',

    -- GL accounts
    debit_account_id        UUID NOT NULL,   -- Cash or Bank account
    credit_account_id       UUID NOT NULL,   -- AR account

    status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'posted', 'cancelled')),

    -- Links
    gl_journal_entry_id     UUID,            -- set after posting, references gl module
    ar_ap_ledger_entry_id   UUID REFERENCES ar_ap_ledger_entries(id),

    -- Cancellation
    cancelled_at            TIMESTAMPTZ,
    cancelled_by            UUID,

    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_receipt_voucher_number UNIQUE (company_id, voucher_number)
);

CREATE INDEX idx_receipt_voucher_customer ON receipt_vouchers (company_id, customer_id, status);
CREATE INDEX idx_receipt_voucher_date ON receipt_vouchers (company_id, voucher_date);

-- ============================================================
-- PAYMENT VOUCHER (AP side)
-- ============================================================
CREATE TABLE payment_vouchers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,

    voucher_number          VARCHAR(50) NOT NULL,
    voucher_date            DATE NOT NULL,
    accounting_period       CHAR(7) NOT NULL,

    supplier_id             UUID NOT NULL,
    paid_amount             NUMERIC(20,4) NOT NULL CHECK (paid_amount > 0),
    currency_code           CHAR(3) NOT NULL DEFAULT 'VND',

    -- GL accounts
    debit_account_id        UUID NOT NULL,   -- AP account
    credit_account_id       UUID NOT NULL,   -- Cash or Bank account

    status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'posted', 'cancelled')),

    -- Links
    gl_journal_entry_id     UUID,
    ar_ap_ledger_entry_id   UUID REFERENCES ar_ap_ledger_entries(id),

    -- Cancellation
    cancelled_at            TIMESTAMPTZ,
    cancelled_by            UUID,

    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_payment_voucher_number UNIQUE (company_id, voucher_number)
);

CREATE INDEX idx_payment_voucher_supplier ON payment_vouchers (company_id, supplier_id, status);
CREATE INDEX idx_payment_voucher_date ON payment_vouchers (company_id, voucher_date);

-- ============================================================
-- APPEND-ONLY POLICY NOTES
-- DB triggers above enforce no UPDATE/DELETE on ar_ap_ledger_entries and ar_ap_allocations.
-- Application role should also be revoked from UPDATE/DELETE where deployment permits.
-- Allocation cancellation is a new negative event row.
-- Corrections are made via reversal entries and new documents.
-- ============================================================
