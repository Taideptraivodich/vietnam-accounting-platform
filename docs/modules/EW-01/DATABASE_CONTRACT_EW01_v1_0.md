# Database Contract EW-01 v1.0 — Round 3 Hotfix

## 1. Canonical table names

Canonical shared tables owned by EW-01:

```text
companies
accounts
account_mappings
fiscal_periods
journal_entries
journal_entry_lines
gl_entries
```

`accounts` is the canonical account table. EW-01 does **not** create or approve `chart_of_accounts` in this patch.

Canonical reference convention:

```text
Physical PK: accounts.id
Payload/reference field: account_id = accounts.id
Forbidden unless separately approved: physical accounts.account_id column
```

## 2. `companies`

```text
id UUID PK
code VARCHAR unique
name VARCHAR
base_currency CHAR(3) default VND
timezone VARCHAR default Asia/Ho_Chi_Minh
is_active BOOLEAN
created_at / updated_at
```

## 3. `accounts`

Required contract fields:

```text
id UUID PK
company_id UUID FK companies(id)
code VARCHAR(32)
name VARCHAR(255)
account_type ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE
account_subtype VARCHAR(64)
normal_balance DEBIT|CREDIT
is_group BOOLEAN
parent_id UUID self FK
is_postable BOOLEAN
requires_tax_info BOOLEAN
requires_inventory_item BOOLEAN
requires_warehouse BOOLEAN
requires_party BOOLEAN
default_party_type CUSTOMER|SUPPLIER|EMPLOYEE|OTHER nullable
is_bipolar BOOLEAN
presentation_rule VARCHAR(64)
phase_scope VARCHAR(32)
accounting_regime VARCHAR(32)
currency CHAR(3)
is_active BOOLEAN
created_at / updated_at
UNIQUE(company_id, code)
```

Freeze-compatible baseline `account_subtype` values include:

```text
cash
bank
receivable
payable
vat_input
vat_output
sales_revenue
purchase_expense
merchandise_inventory
finished_goods
raw_material
tools
cogs
goods_sent_for_sale
goods_received_not_invoiced
equity
retained_earnings
other_asset
other_liability
other_income
other_expense
```

Rules:

- Group accounts cannot be postable.
- Inactive accounts cannot be posted.
- Company isolation is mandatory.
- Business modules must pass `account_id` values that are `accounts.id`.
- Do not reference a physical `accounts.account_id` column.

## 4. `account_mappings`

Resolver override table for module-specific dimensions:

```text
id UUID PK
company_id UUID FK companies(id)
account_subtype VARCHAR(64)
account_id UUID FK accounts(id)
payment_method VARCHAR nullable
party_type VARCHAR nullable
party_id UUID nullable
item_id UUID nullable
warehouse_id UUID nullable
is_default BOOLEAN
priority INTEGER
is_active BOOLEAN
created_at
```

Resolution order:

1. Explicit account ID, where the resolver allows it.
2. Matching active `account_mappings` row ordered by `priority`, `is_default`, `created_at`.
3. Company default active/postable `accounts` row matching `account_subtype`.

## 5. `journal_entries`

```text
id UUID PK
company_id UUID FK companies(id)
entry_number VARCHAR
posting_date DATE
description TEXT
status DRAFT|POSTED|CANCELLED
source_document_type VARCHAR
source_document_id UUID
source_document_no VARCHAR
idempotency_key VARCHAR
reversal_of_id UUID FK journal_entries(id)
reversed_by_id UUID FK journal_entries(id)
created_at / updated_at
```

Indexes:

```text
UNIQUE(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL
(company_id, posting_date)
(company_id, source_document_type, source_document_id)
```

## 6. `journal_entry_lines`

```text
id UUID PK
journal_entry_id UUID FK journal_entries(id)
company_id UUID FK companies(id)
account_id UUID FK accounts(id)
debit_amount BIGINT
credit_amount BIGINT
currency CHAR(3)
description TEXT
source_document_type VARCHAR
source_document_id UUID
source_document_no VARCHAR
source_document_line_id UUID
party_type VARCHAR
party_id UUID
warehouse_id UUID
inventory_item_id UUID
inventory_ledger_entry_id UUID
tax_metadata JSONB
created_at
```

Rules:

- Amounts are non-negative.
- A line cannot have both debit and credit.
- A line must have one positive side.
- Posted/cancelled JE lines are immutable; reverse instead.
- If the account requires party, warehouse, inventory item, or tax metadata, the line must provide it.

## 7. `gl_entries`

```text
id UUID PK
company_id UUID FK companies(id)
journal_entry_id UUID FK journal_entries(id)
journal_entry_line_id UUID FK journal_entry_lines(id)
account_id UUID FK accounts(id)
posting_date DATE
debit_amount BIGINT
credit_amount BIGINT
currency CHAR(3)
source_document_type VARCHAR
source_document_id UUID
source_document_no VARCHAR
source_document_line_id UUID
party_type VARCHAR
party_id UUID
warehouse_id UUID
inventory_item_id UUID
inventory_ledger_entry_id UUID
tax_metadata JSONB
idempotency_key VARCHAR
created_at
```

No `updated_at` exists on `gl_entries` because GL is append-only.

Indexes:

```text
(company_id, posting_date)
(account_id)
(company_id, source_document_type, source_document_id)
(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL
```

## 8. `fiscal_periods`

```text
id UUID PK
company_id UUID FK companies(id)
name VARCHAR
start_date DATE
end_date DATE
is_locked BOOLEAN
created_at
UNIQUE(company_id, start_date, end_date)
```

Core Accounting rejects posting/reversal into locked periods.
