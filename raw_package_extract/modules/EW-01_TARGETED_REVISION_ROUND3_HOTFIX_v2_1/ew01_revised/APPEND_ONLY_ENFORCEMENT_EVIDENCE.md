# Append-only Enforcement Evidence — EW-01

## 1. Required senior rule

```text
No update/delete of posted gl_entries financial fields.
No delete of posted journal_entries.
Reversal creates new journal entry and new GL rows.
```

## 2. Code-level guard

`GlEntryRepository` exposes only append/query methods:

```text
appendBatch
findByIdempotencyKey
queryByJournalEntryId
queryByCompanyAndDateRange
queryByAccount
trialBalance
```

It exposes no:

```text
update
delete
deleteById
updateById
```

Business modules must not import or write `GlEntryRepository` directly. They call `PostingService` only.

## 3. Database-level guard for `gl_entries`

Migration `migrations/001_gl_foundation.sql` defines trigger function:

```sql
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
```

Triggers:

```sql
trg_gl_entries_no_update BEFORE UPDATE ON gl_entries
trg_gl_entries_no_delete BEFORE DELETE ON gl_entries
```

This replaces the previous silent `RULE ... DO INSTEAD NOTHING` behavior. Attempts now fail loudly.

## 4. Database-level guard for posted JE rows

Migration defines:

```sql
trg_posted_journal_entries_no_delete
```

It blocks delete of `journal_entries` with status `POSTED` or `CANCELLED`.

It also defines:

```sql
trg_posted_journal_entries_guard_update
```

This blocks mutation of posted/cancelled JE financial/source identity fields:

```text
company_id
posting_date
source_document_type
source_document_id
source_document_no
idempotency_key
reversal_of_id
```

Lifecycle fields `status` and `reversed_by_id` are allowed for the reversal link only.

## 5. Database-level guard for posted JE lines

Migration defines:

```sql
trg_posted_journal_entry_lines_no_update
trg_posted_journal_entry_lines_no_delete
```

Once a parent JE is `POSTED` or `CANCELLED`, JE lines cannot be updated or deleted.

## 6. Reversal behavior

`reverseAccountingDocument(request, tx)`:

1. Finds original posted JE.
2. Validates reversal date and fiscal period.
3. Creates a new posted reversal JE.
4. Copies original lines with debit/credit swapped.
5. Appends new GL entries.
6. Links original JE to reversal JE.

It never updates or deletes original GL rows.

## 7. Test evidence

`node tests/run_unit_tests.js` verifies:

```text
reverseAccountingDocument appends reversal JE and GL rows only
gl_entries update/delete is blocked by repository surface and DB guard evidence
```
