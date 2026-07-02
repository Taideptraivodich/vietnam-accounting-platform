-- EW-06 VAT Ledger Revision
-- Migration: create tax_ledger_entries append-only ledger with EW-01 journal link.
--
-- EW-06 owns tax_ledger_entries only. It does not create or mutate gl_entries.
-- tax_account_id is supplied by Sales/Purchase from company account mappings.
-- journal_entry_id is supplied from EW-01 postAccountingDocument/reversal result.

BEGIN;

CREATE TABLE IF NOT EXISTS tax_ledger_entries (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id                  UUID NOT NULL,
    posting_date                DATE NOT NULL,

    source_document_type        TEXT NOT NULL,
    source_document_id          UUID NOT NULL,
    source_document_line_id     UUID NOT NULL,

    invoice_no                  TEXT NOT NULL,
    invoice_date                DATE NOT NULL,

    tax_direction               TEXT NOT NULL CHECK (tax_direction IN ('input', 'output')),
    tax_type                    TEXT NOT NULL DEFAULT 'vat' CHECK (tax_type = 'vat'),
    tax_rate                    NUMERIC(7,4) NOT NULL,
    tax_category                TEXT NULL,

    -- Canonical account reference for the VAT account chosen by Sales/Purchase
    -- from company account mappings. EW-06 does not decide this mapping.
    tax_account_id              UUID NOT NULL,

    -- Link to the journal entry returned by EW-01 posting/reversal service.
    journal_entry_id            UUID NOT NULL,

    party_type                  TEXT NOT NULL,
    party_id                    UUID NOT NULL,

    taxable_amount              NUMERIC(20,2) NOT NULL,
    tax_amount                  NUMERIC(20,2) NOT NULL,
    currency                    TEXT NULL,

    is_reversal                 BOOLEAN NOT NULL DEFAULT FALSE,
    reversal_of_entry_id        UUID NULL REFERENCES tax_ledger_entries(id),

    idempotency_key             TEXT NOT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK notes:
-- Add/validate FK tax_account_id -> accounts(id) and journal_entry_id -> journal_entries(id)
-- once EW-01 publishes final canonical schema names/contracts. No chart_of_accounts
-- dependency is introduced here.

CREATE UNIQUE INDEX IF NOT EXISTS ux_tax_ledger_entries_idempotency_key
    ON tax_ledger_entries (idempotency_key);

CREATE INDEX IF NOT EXISTS ix_tax_ledger_entries_company_posting_date
    ON tax_ledger_entries (company_id, posting_date);

CREATE INDEX IF NOT EXISTS ix_tax_ledger_entries_company_direction
    ON tax_ledger_entries (company_id, tax_direction);

CREATE INDEX IF NOT EXISTS ix_tax_ledger_entries_source_document
    ON tax_ledger_entries (company_id, source_document_type, source_document_id);

CREATE INDEX IF NOT EXISTS ix_tax_ledger_entries_journal_entry
    ON tax_ledger_entries (company_id, journal_entry_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime_role') THEN
        EXECUTE 'REVOKE UPDATE, DELETE ON tax_ledger_entries FROM app_runtime_role';
        EXECUTE 'GRANT INSERT, SELECT ON tax_ledger_entries TO app_runtime_role';
    ELSE
        RAISE NOTICE 'Role app_runtime_role does not exist yet; skipping GRANT/REVOKE. Apply manually once the runtime role is provisioned.';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_tax_ledger_entries_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'tax_ledger_entries is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tax_ledger_entries_block_update ON tax_ledger_entries;
CREATE TRIGGER trg_tax_ledger_entries_block_update
    BEFORE UPDATE ON tax_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION fn_tax_ledger_entries_block_mutation();

DROP TRIGGER IF EXISTS trg_tax_ledger_entries_block_delete ON tax_ledger_entries;
CREATE TRIGGER trg_tax_ledger_entries_block_delete
    BEFORE DELETE ON tax_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION fn_tax_ledger_entries_block_mutation();

COMMIT;
