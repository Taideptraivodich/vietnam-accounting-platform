# Open Questions — EW-01 Targeted Revision

## 1. `chart_of_accounts` compatibility view

EW-01 keeps `accounts` as the only canonical account table and does not create `chart_of_accounts`.

Open senior decision:

```text
Should EW-01 provide a temporary read-only compatibility VIEW named chart_of_accounts for migration only?
```

Default answer in this patch: **No**, because the senior blocker says modules must align to `accounts` unless Senior explicitly approves a separate read model.

## 2. Inventory many-to-many GL linking

EW-01 supports one direct link field:

```text
inventory_ledger_entry_id
```

For cases where one inventory event maps to multiple GL lines or one GL line summarizes multiple inventory events, Inventory may need a module-owned table:

```text
inventory_gl_links(inventory_ledger_entry_id, journal_entry_id, gl_entry_id, ...)
```

EW-01 returns `journal_entry_id` and `gl_entry_ids` so EW-05 can build that table without changing GL ownership.

## 3. Fiscal period behavior when no period exists

Current EW-01 behavior preserves the previous implementation:

```text
No fiscal_period row = not locked
```

Senior may later require “period must exist” as a stricter posting rule. That is not added here to avoid new scope.

## 4. JE lifecycle status

This patch keeps the existing status model:

```text
DRAFT | POSTED | CANCELLED
```

On reversal, original JE status becomes `CANCELLED` and links to `reversed_by_id`; original GL rows remain untouched. If Senior prefers original JE to remain `POSTED` with only a reversal link, this can be changed without changing GL append-only behavior.
