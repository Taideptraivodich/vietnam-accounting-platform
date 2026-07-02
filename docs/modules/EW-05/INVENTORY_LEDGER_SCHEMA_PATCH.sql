-- EW-05 Inventory Mergeable Implementation P0 v1.1
-- Apply order: after EW-01 Core Accounting / GL, EW-06 VAT, EW-02 AR/AP, and MD-01 Master Data.
-- Scope: Freeze v1.0 only. This migration does not create shared Core Accounting tables.

BEGIN;

CREATE TABLE IF NOT EXISTS inventory_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  item_id UUID NOT NULL REFERENCES items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  posting_date DATE NOT NULL,
  posting_time TIME NOT NULL DEFAULT '00:00:00',
  source_document_type TEXT NOT NULL,
  source_document_id UUID NOT NULL,
  source_document_line_id UUID,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'opening_stock',
    'receipt',
    'issue',
    'inventory_adjustment',
    'transfer_out',
    'transfer_in',
    'reversal'
  )),
  quantity_change NUMERIC(18, 6) NOT NULL CHECK (quantity_change <> 0),
  qty_after_transaction NUMERIC(18, 6) NOT NULL,
  valuation_rate NUMERIC(18, 6) NOT NULL CHECK (valuation_rate >= 0),
  stock_value NUMERIC(18, 2) NOT NULL,
  stock_value_difference NUMERIC(18, 2) NOT NULL,
  transfer_group_id UUID,
  transfer_pair_id UUID REFERENCES inventory_ledger_entries(id),
  is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
  reverses_inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_ledger_reversal_consistency CHECK (
    (is_reversal = FALSE AND reverses_inventory_ledger_entry_id IS NULL)
    OR
    (is_reversal = TRUE AND reverses_inventory_ledger_entry_id IS NOT NULL)
  ),
  CONSTRAINT inventory_ledger_transfer_pairing_consistency CHECK (
    (movement_type NOT IN ('transfer_out', 'transfer_in') AND transfer_group_id IS NULL AND transfer_pair_id IS NULL)
    OR
    (movement_type IN ('transfer_out', 'transfer_in') AND transfer_group_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_company_item_wh_time
  ON inventory_ledger_entries(company_id, item_id, warehouse_id, posting_date, posting_time, created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_source_document
  ON inventory_ledger_entries(company_id, source_document_type, source_document_id);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_transfer_group
  ON inventory_ledger_entries(company_id, transfer_group_id);

CREATE TABLE IF NOT EXISTS stock_balances (
  company_id UUID NOT NULL REFERENCES companies(id),
  item_id UUID NOT NULL REFERENCES items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  actual_qty NUMERIC(18, 6) NOT NULL DEFAULT 0,
  stock_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  valuation_rate NUMERIC(18, 6) NOT NULL DEFAULT 0,
  last_inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, item_id, warehouse_id),
  CONSTRAINT stock_balances_non_negative_qty CHECK (actual_qty >= 0),
  CONSTRAINT stock_balances_non_negative_rate CHECK (valuation_rate >= 0)
);

COMMENT ON TABLE stock_balances IS 'Mutable/rebuildable cache only. Source of truth is inventory_ledger_entries.';

CREATE TABLE IF NOT EXISTS opening_stock_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  item_id UUID NOT NULL REFERENCES items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  posting_date DATE NOT NULL,
  posting_time TIME NOT NULL DEFAULT '00:00:00',
  quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
  valuation_rate NUMERIC(18, 6) NOT NULL CHECK (valuation_rate >= 0),
  opening_stock_offset_account_id UUID NOT NULL REFERENCES accounts(id),
  inventory_account_id UUID NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'posted', 'cancelled')) DEFAULT 'draft',
  inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries(id),
  journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  item_id UUID NOT NULL REFERENCES items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  posting_date DATE NOT NULL,
  posting_time TIME NOT NULL DEFAULT '00:00:00',
  quantity_change NUMERIC(18, 6) NOT NULL CHECK (quantity_change <> 0),
  valuation_rate NUMERIC(18, 6) CHECK (valuation_rate IS NULL OR valuation_rate >= 0),
  adjustment_reason TEXT NOT NULL CHECK (LENGTH(TRIM(adjustment_reason)) > 0),
  offset_account_id UUID NOT NULL REFERENCES accounts(id),
  inventory_account_id UUID NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'posted', 'cancelled')) DEFAULT 'draft',
  inventory_ledger_entry_id UUID REFERENCES inventory_ledger_entries(id),
  journal_entry_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION reject_inventory_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'inventory_ledger_entries is append-only; posted rows cannot be updated or deleted'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_ledger_reject_update ON inventory_ledger_entries;
CREATE TRIGGER trg_inventory_ledger_reject_update
BEFORE UPDATE ON inventory_ledger_entries
FOR EACH ROW EXECUTE FUNCTION reject_inventory_ledger_mutation();

DROP TRIGGER IF EXISTS trg_inventory_ledger_reject_delete ON inventory_ledger_entries;
CREATE TRIGGER trg_inventory_ledger_reject_delete
BEFORE DELETE ON inventory_ledger_entries
FOR EACH ROW EXECUTE FUNCTION reject_inventory_ledger_mutation();

CREATE OR REPLACE FUNCTION validate_inventory_ledger_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qty_after_transaction < 0 THEN
    RAISE EXCEPTION 'negative stock is blocked by default for company %, item %, warehouse %',
      NEW.company_id, NEW.item_id, NEW.warehouse_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM inventory_ledger_entries existing
    WHERE existing.company_id = NEW.company_id
      AND existing.item_id = NEW.item_id
      AND existing.warehouse_id = NEW.warehouse_id
      AND (existing.posting_date, existing.posting_time, existing.created_at) >
          (NEW.posting_date, NEW.posting_time, NOW())
  ) THEN
    RAISE EXCEPTION 'backdated inventory post/cancel is blocked because a later entry exists for company %, item %, warehouse %',
      NEW.company_id, NEW.item_id, NEW.warehouse_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_ledger_validate_insert ON inventory_ledger_entries;
CREATE TRIGGER trg_inventory_ledger_validate_insert
BEFORE INSERT ON inventory_ledger_entries
FOR EACH ROW EXECUTE FUNCTION validate_inventory_ledger_insert();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'gl_entries'
      AND column_name = 'inventory_ledger_entry_id'
      AND udt_name <> 'uuid'
  ) THEN
    RAISE EXCEPTION 'gl_entries.inventory_ledger_entry_id must be UUID for EW-05 v1.1 integration';
  END IF;
END;
$$;

ALTER TABLE gl_entries
  ADD COLUMN IF NOT EXISTS inventory_ledger_entry_id UUID;

CREATE INDEX IF NOT EXISTS idx_gl_entries_inventory_ledger_entry_id
  ON gl_entries(inventory_ledger_entry_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_gl_entries_inventory_ledger_entry_id'
  ) THEN
    ALTER TABLE gl_entries
      ADD CONSTRAINT fk_gl_entries_inventory_ledger_entry_id
      FOREIGN KEY (inventory_ledger_entry_id)
      REFERENCES inventory_ledger_entries(id);
  END IF;
END;
$$;

COMMIT;
