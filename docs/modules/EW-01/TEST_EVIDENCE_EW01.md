# Test Evidence — EW-01 Round 3 Hotfix

## Command executed

```bash
cd /mnt/data/ew01_round3_work/ew01_revised && node tests/run_unit_tests.js
```

## Result

```text
✓ accounts.account_subtype CHECK accepts only canonical goods_received_not_invoiced subtype
✓ postAccountingDocument requires caller transaction
✓ postAccountingDocument posts through provided tx without BEGIN/COMMIT
✓ UnitOfWork opens and commits once around source + GL work
✓ postAccountingDocument is idempotent by company-scoped idempotency_key
✓ validator rejects unbalanced lines
✓ locked fiscal period blocks posting
✓ reverseAccountingDocument appends reversal JE and GL rows only
✓ gl_entries update/delete is blocked by repository surface and DB guard evidence
✓ accounts contract exposes metadata without physical accounts.account_id
✓ account resolver returns account_id payload alias equal to accounts.id
✓ resolveGRNIAccount resolves goods_received_not_invoiced and returns account_id alias
✓ cash/bank resolver honors explicit account_id and mapping fallback
✓ validator enforces freeze account metadata dimensions
✓ VAT metadata account requires tax_metadata

All EW-01 targeted revision tests passed.
```

## Coverage against senior Round 3 EW-01 P0 hotfix checklist

| Senior requirement | Test / evidence |
|---|---|
| `accounts.account_subtype` CHECK accepts `goods_received_not_invoiced` | `accounts.account_subtype CHECK accepts only canonical goods_received_not_invoiced subtype` |
| Legacy abbreviation is not required/kept as an accepted CHECK subtype | same CHECK contract test validates only the canonical subtype string appears in migration subtype list |
| `resolveGRNIAccount()` resolves `goods_received_not_invoiced` | `resolveGRNIAccount resolves goods_received_not_invoiced and returns account_id alias` |
| Payload returns `account_id = accounts.id` | `resolveGRNIAccount resolves goods_received_not_invoiced and returns account_id alias` and existing resolver alias test |
| Existing transaction boundary preserved | first three transaction-boundary tests |
| Existing GL append-only behavior preserved | append-only repository/DB guard test and reversal append-only test |
