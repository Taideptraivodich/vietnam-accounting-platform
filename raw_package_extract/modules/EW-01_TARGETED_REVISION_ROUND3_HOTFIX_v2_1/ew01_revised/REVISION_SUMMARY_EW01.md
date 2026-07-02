# REVISION SUMMARY — EW-01 Targeted Patch v1.0

## Senior result addressed

Senior status before this patch: **PASS WITH REQUIRED PATCHES**. This revision addresses the P0 blockers for Core Accounting / GL before EW-02 to EW-06 alignment.

## P0 patch result

| P0 item | Result | Evidence |
|---|---:|---|
| P0-01 Canonical account table contract | Done | `accounts` is documented as the only canonical account table. `companies`, `accounts`, `journal_entries`, and `gl_entries` schema contracts are published. |
| P0-02 GL posting service contract | Done | `PostingService.postAccountingDocument(request, tx)` and `PostingService.reverseAccountingDocument(request, tx)` implemented and documented. |
| P0-03 Transaction boundary / Unit of Work | Done | Business modules must open the transaction and pass the same `tx`. Core Accounting contract methods do not `BEGIN` or `COMMIT`. |
| P0-04 Append-only enforcement | Done | `gl_entries` has trigger guards that raise errors on update/delete; posted JE lines cannot be mutated/deleted; posted/cancelled JE headers cannot have financial/source identity fields changed. |
| P0-05 Downstream return contract | Done | Posting/reversal results include `journal_entry_id`, `gl_entry_ids`, `source_document_type`, `source_document_id`, `source_document_no`, `status`, and `idempotent`. |

## Changed code

- Added transaction-aware repository methods with optional `tx` argument.
- Added required shared posting API:
  - `postAccountingDocument(request, tx)`
  - `reverseAccountingDocument(request, tx)`
- Added `UnitOfWork.withTransaction(db, work)` for top-level application services.
- Preserved backward-compatible manual JE APIs (`createDraft`, `updateDraft`, `post`, `cancel`) for admin/manual flows only.
- Added HTTP admin endpoints for standalone posting/reversal, while documenting that business modules must call the service directly inside their own transaction.

## Changed schema

- Added canonical `companies` table.
- Published canonical `accounts` table and explicitly rejected module dependency on `chart_of_accounts`.
- Added `source_document_no` and `tax_metadata` passthrough to JE lines and GL entries.
- Replaced silent PostgreSQL `RULE ... DO INSTEAD NOTHING` append-only enforcement with trigger functions that raise explicit exceptions.
- Added guards for posted/cancelled journal entry lines and posted/cancelled JE header identity fields.

## Test evidence

Executed:

```bash
cd /mnt/data/ew01_revised && node tests/run_unit_tests.js
```

Result:

```text
8/8 tests passed
```

See `TEST_EVIDENCE_EW01.md` for details.
