-- EW-03 Targeted Revision v1.2
-- Sales / Delivery Baseline aligned to Senior P0 review.
-- Key alignment points:
--   * canonical accounts table only (no legacy COA-table dependency)
--   * semantic company setting: invoice_updates_stock or delivery_then_invoice
--   * business module composes accounting lines; EW-01 writes GL through postAccountingDocument
--   * VAT output GL line is composed by Sales with a configured account_id

-- ============================================================
-- COMPANY SALES SETTINGS
-- ============================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sales_stock_pattern VARCHAR(32) NULL
    CHECK (sales_stock_pattern IN ('invoice_updates_stock', 'delivery_then_invoice'));

COMMENT ON COLUMN companies.sales_stock_pattern IS
  'Company sales flow setting. invoice_updates_stock = Sales Invoice updates stock. delivery_then_invoice = Delivery Note first, Sales Invoice later. Must be configured per company.';

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS goods_sent_for_sale_account_id UUID NULL
    REFERENCES accounts(id) ON DELETE RESTRICT;

COMMENT ON COLUMN companies.goods_sent_for_sale_account_id IS
  'Configured accounts.id with subtype goods_sent_for_sale. TT99 candidate mapping is TK 157; business logic must not hard-code account code.';

-- ============================================================
-- SALES INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_invoices (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  invoice_number        VARCHAR(64) NOT NULL,
  status                VARCHAR(16) NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'posted', 'cancelled')),
  sale_type             VARCHAR(16) NOT NULL DEFAULT 'credit'
                          CHECK (sale_type IN ('credit', 'cash')),
  stock_pattern         VARCHAR(32) NOT NULL
                          CHECK (stock_pattern IN ('invoice_updates_stock', 'delivery_then_invoice')),
  customer_id           UUID        NOT NULL,
  posting_date          DATE        NULL,
  due_date              DATE        NULL,
  currency              VARCHAR(8)  NOT NULL DEFAULT 'VND',
  total_amount          NUMERIC(20,4) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(20,4) NOT NULL DEFAULT 0,
  grand_total           NUMERIC(20,4) NOT NULL DEFAULT 0,
  payment_method       VARCHAR(32) NULL
                          CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other_bank')),
  payment_account_id   UUID        NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  cash_account_id      UUID        NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  idempotency_key       VARCHAR(128) NULL,
  delivery_note_id      UUID        NULL,
  journal_entry_id      UUID        NULL,
  posted_at             TIMESTAMPTZ NULL,
  cancelled_at          TIMESTAMPTZ NULL,
  cancellation_reason   TEXT        NULL,
  reversal_journal_entry_id UUID    NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_si_company_status ON sales_invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_si_customer       ON sales_invoices(company_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_si_posting_date   ON sales_invoices(company_id, posting_date);
CREATE INDEX IF NOT EXISTS idx_si_idempotency    ON sales_invoices(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
COMMENT ON COLUMN sales_invoices.payment_method IS
  'Cash-sale account resolver hint. cash resolves cash subtype; bank_transfer/card/other_bank resolve bank subtype unless explicit payment_account_id/cash_account_id is provided.';

COMMENT ON COLUMN sales_invoices.payment_account_id IS
  'Explicit payment account reference. Value stores accounts.id; no physical accounts.account_id column is required.';

COMMENT ON COLUMN sales_invoices.cash_account_id IS
  'Backward-compatible explicit cash/bank account reference. Value stores accounts.id; prefer payment_account_id for new integrations.';


-- ============================================================
-- SALES INVOICE LINES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id    UUID          NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  company_id          UUID          NOT NULL,
  line_number         INTEGER       NOT NULL,
  item_id             UUID          NOT NULL,
  warehouse_id        UUID          NOT NULL,
  description         TEXT          NULL,
  quantity            NUMERIC(20,6) NOT NULL CHECK (quantity > 0),
  unit_price          NUMERIC(20,4) NOT NULL CHECK (unit_price >= 0),
  line_amount         NUMERIC(20,4) NOT NULL,
  tax_rate            NUMERIC(6,4)  NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(20,4) NOT NULL DEFAULT 0,
  revenue_account_id  UUID          NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  UNIQUE (sales_invoice_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_sil_invoice ON sales_invoice_lines(sales_invoice_id);

-- ============================================================
-- DELIVERY NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_notes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  delivery_number     VARCHAR(64) NOT NULL,
  status              VARCHAR(16) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'posted', 'cancelled')),
  customer_id         UUID        NOT NULL,
  sales_invoice_id    UUID        NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  posting_date        DATE        NULL,
  idempotency_key     VARCHAR(128) NULL,
  journal_entry_id    UUID        NULL,
  posted_at           TIMESTAMPTZ NULL,
  cancelled_at        TIMESTAMPTZ NULL,
  cancellation_reason TEXT        NULL,
  reversal_journal_entry_id UUID  NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, delivery_number)
);

CREATE INDEX IF NOT EXISTS idx_dn_company_status ON delivery_notes(company_id, status);
CREATE INDEX IF NOT EXISTS idx_dn_idempotency    ON delivery_notes(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- DELIVERY NOTE LINES
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_note_lines (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID          NOT NULL REFERENCES delivery_notes(id) ON DELETE RESTRICT,
  company_id       UUID          NOT NULL,
  line_number      INTEGER       NOT NULL,
  item_id          UUID          NOT NULL,
  warehouse_id     UUID          NOT NULL,
  quantity         NUMERIC(20,6) NOT NULL CHECK (quantity > 0),
  UNIQUE (delivery_note_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_dnl_dn ON delivery_note_lines(delivery_note_id);

-- Shared ledgers are not created here:
--   gl_entries: EW-01 only through postAccountingDocument/reverseAccountingDocument
--   ar_ap_ledger_entries / ar_ap_allocations: EW-02 only
--   inventory_ledger_entries: EW-05 only through generic inventoryIssueService
--   tax_ledger_entries: EW-06 only; Sales passes journal_entry_id after GL posting
