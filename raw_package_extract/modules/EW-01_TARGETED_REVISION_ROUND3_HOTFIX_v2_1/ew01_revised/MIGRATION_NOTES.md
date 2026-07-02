# Migration Notes — EW-01

## Apply order

```text
migrations/001_gl_foundation.sql
```

## Important changes from previous EW-01 complete package

1. Adds `companies` table.
2. Keeps `accounts` as canonical table and documents no `chart_of_accounts` alias.
3. Adds `source_document_no` to JE/JE lines/GL.
4. Adds `tax_metadata JSONB` to JE lines/GL.
5. Changes append-only enforcement from silent PostgreSQL rules to explicit triggers that raise exceptions.
6. Adds guards for posted/cancelled JE line update/delete.
7. Adds posted/cancelled JE header identity-field immutability trigger.

## Deployment caution

If previous silent rules exist, remove them before/while applying this migration:

```sql
DROP RULE IF EXISTS gl_entries_no_update ON gl_entries;
DROP RULE IF EXISTS gl_entries_no_delete ON gl_entries;
```

The included migration creates trigger-based guards after table creation.
