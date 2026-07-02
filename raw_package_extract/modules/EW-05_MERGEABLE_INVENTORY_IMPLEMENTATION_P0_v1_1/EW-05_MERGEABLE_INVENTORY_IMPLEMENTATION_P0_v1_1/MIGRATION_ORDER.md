# MIGRATION_ORDER — EW-05 P0 v1.1

## Required order

Apply EW-05 after the frozen upstream baseline is present:

```text
1. EW-01 Core Accounting / GL baseline
2. EW-06 VAT baseline
3. EW-02 AR/AP baseline
4. MD-01 Master Data baseline
5. EW-05 Inventory v1.1
```

## EW-05 migration file

```text
migrations/001_inventory_mergeable_v1_1.sql
INVENTORY_LEDGER_SCHEMA_PATCH.sql
```

`INVENTORY_LEDGER_SCHEMA_PATCH.sql` is a root-level copy of the executable migration for reviewer convenience.

## Upstream dependencies

EW-05 v1.1 expects these upstream canonical objects to exist before apply:

```text
companies(id UUID)
accounts(id UUID)
items(id UUID)
warehouses(id UUID)
gl_entries.inventory_ledger_entry_id UUID, or gl_entries without that column yet
```

EW-05 does not create duplicate `companies`, `accounts`, `journal_entries`, or `gl_entries` tables.

## Stop condition

If `gl_entries.inventory_ledger_entry_id` already exists but is not UUID, the migration raises an exception. That is an integration blocker and must not be worked around inside EW-05.
