-- EW-04 Purchase / GRNI Baseline Migration
-- Architecture Freeze v1.0 / Round 2 P0 revision
-- Depends on: EW-01 accounts(id + account_subtype metadata), EW-01 postAccountingDocument contract, EW-02 AP ledger, EW-05 inventory ledger

-- ============================================================
-- PURCHASE RECEIPTS
-- Pattern P2 receipt-before-invoice starts here:
--   Purchase Receipt: Dr Inventory Cr GRNI
-- ============================================================
CREATE TABLE purchase_receipts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    supplier_id         UUID NOT NULL,
    receipt_number      VARCHAR(100),
    receipt_date        DATE NOT NULL,
    posting_date        DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','posted','cancelled')),
    currency_code       CHAR(3) NOT NULL DEFAULT 'VND',
    total_amount        NUMERIC(20,4) NOT NULL DEFAULT 0,
    idempotency_key     VARCHAR(200) UNIQUE,
    notes               TEXT,
    posted_at           TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    reversal_of_id      UUID REFERENCES purchase_receipts(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pr_company_id   ON purchase_receipts(company_id);
CREATE INDEX idx_pr_supplier_id  ON purchase_receipts(supplier_id);
CREATE INDEX idx_pr_status       ON purchase_receipts(company_id, status);

-- ============================================================
-- PURCHASE RECEIPT LINES
-- ============================================================
CREATE TABLE purchase_receipt_lines (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    purchase_receipt_id UUID NOT NULL REFERENCES purchase_receipts(id),
    line_number         INTEGER NOT NULL,
    item_id             UUID NOT NULL,
    warehouse_id        UUID NOT NULL,
    description         TEXT,
    quantity            NUMERIC(20,6) NOT NULL,
    unit_cost           NUMERIC(20,4) NOT NULL,
    line_amount         NUMERIC(20,4) NOT NULL,
    billed_qty          NUMERIC(20,6) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prl_receipt_id ON purchase_receipt_lines(purchase_receipt_id);
CREATE INDEX idx_prl_company_id ON purchase_receipt_lines(company_id);

-- ============================================================
-- PURCHASE INVOICES
-- Supports both freeze-approved stock patterns:
-- P1 direct_invoice_stock: Dr Inventory Dr VAT Input Cr AP/Cash/Bank
-- P2 receipt_then_invoice: Dr GRNI Dr VAT Input Cr AP/Cash/Bank
-- ============================================================
CREATE TABLE purchase_invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    supplier_id         UUID NOT NULL,
    invoice_number      VARCHAR(100),
    invoice_date        DATE NOT NULL,
    posting_date        DATE NOT NULL,
    due_date            DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','posted','cancelled')),
    payment_method      VARCHAR(20) NOT NULL DEFAULT 'credit'
                            CHECK (payment_method IN ('credit','cash','bank')),
    cash_bank_account_id UUID, -- business/reference field; value is EW-01 accounts.id
    stock_update_pattern VARCHAR(30) NOT NULL DEFAULT 'direct_invoice_stock'
                            CHECK (stock_update_pattern IN ('direct_invoice_stock','receipt_then_invoice')),
    currency_code       CHAR(3) NOT NULL DEFAULT 'VND',
    subtotal_amount     NUMERIC(20,4) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(20,4) NOT NULL DEFAULT 0,
    received_qty        NUMERIC(20,6) NOT NULL DEFAULT 0,
    billed_qty          NUMERIC(20,6) NOT NULL DEFAULT 0,
    unbilled_qty        NUMERIC(20,6) GENERATED ALWAYS AS (received_qty - billed_qty) STORED,
    received_amount     NUMERIC(20,4) NOT NULL DEFAULT 0,
    billed_amount       NUMERIC(20,4) NOT NULL DEFAULT 0,
    unbilled_amount     NUMERIC(20,4) GENERATED ALWAYS AS (received_amount - billed_amount) STORED,
    idempotency_key     VARCHAR(200) UNIQUE,
    notes               TEXT,
    posted_at           TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    reversal_of_id      UUID REFERENCES purchase_invoices(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pi_company_id        ON purchase_invoices(company_id);
CREATE INDEX idx_pi_supplier_id       ON purchase_invoices(supplier_id);
CREATE INDEX idx_pi_status            ON purchase_invoices(company_id, status);
CREATE INDEX idx_pi_posting_date      ON purchase_invoices(company_id, posting_date);
CREATE INDEX idx_pi_stock_pattern     ON purchase_invoices(company_id, stock_update_pattern);

-- ============================================================
-- PURCHASE INVOICE LINES
-- Receipt link is nullable because P1 direct_invoice_stock has no Receipt.
-- P2 receipt_then_invoice requires both receipt fields, enforced by service validator.
-- ============================================================
CREATE TABLE purchase_invoice_lines (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id),
    line_number         INTEGER NOT NULL,
    item_id             UUID NOT NULL,
    warehouse_id        UUID NOT NULL,
    description         TEXT,
    quantity            NUMERIC(20,6) NOT NULL,
    unit_price          NUMERIC(20,4) NOT NULL,
    line_amount         NUMERIC(20,4) NOT NULL,
    tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(20,4) NOT NULL DEFAULT 0,
    purchase_receipt_id UUID REFERENCES purchase_receipts(id),
    purchase_receipt_line_id UUID REFERENCES purchase_receipt_lines(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
      (purchase_receipt_id IS NULL AND purchase_receipt_line_id IS NULL)
      OR
      (purchase_receipt_id IS NOT NULL AND purchase_receipt_line_id IS NOT NULL)
    )
);

CREATE INDEX idx_pil_invoice_id ON purchase_invoice_lines(purchase_invoice_id);
CREATE INDEX idx_pil_company_id ON purchase_invoice_lines(company_id);
CREATE INDEX idx_pil_receipt_id ON purchase_invoice_lines(company_id, purchase_receipt_id);

-- ============================================================
-- GRNI ACCOUNT METADATA
-- This table stores GRNI-specific guardrail metadata for account references.
-- account_id is a business/reference field whose value is EW-01 accounts.id.
-- No physical account-id alias column is assumed.
-- ============================================================
CREATE TABLE grni_account_metadata (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              UUID NOT NULL,
    account_id              UUID NOT NULL, -- value = EW-01 accounts.id
    account_subtype         VARCHAR(50) NOT NULL DEFAULT 'goods_received_not_invoiced'
                                CHECK (account_subtype = 'goods_received_not_invoiced'),
    requires_party          BOOLEAN NOT NULL DEFAULT TRUE,
    default_party_type      VARCHAR(20) NOT NULL DEFAULT 'supplier'
                                CHECK (default_party_type = 'supplier'),
    requires_inventory_item BOOLEAN NOT NULL DEFAULT TRUE,
    requires_warehouse      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, account_id)
);

CREATE INDEX idx_grni_meta_company ON grni_account_metadata(company_id);

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE purchase_receipts IS 'EW-04 P2: Purchase-owned receiving document. Posts Dr Inventory Cr GRNI.';
COMMENT ON TABLE purchase_invoices IS 'EW-04 Purchase Invoice. Supports P1 direct_invoice_stock and P2 receipt_then_invoice.';
COMMENT ON TABLE grni_account_metadata IS 'EW-04 GRNI guardrail metadata. account_id value references EW-01 accounts.id; GRNI must not map to TK151.';
