# Test Evidence — EW-02 Revision

## Tests Updated

`ar-ap.service.test.ts` was updated to cover:

```text
- EW-01 postAccountingDocument is called for Receipt Voucher posting.
- EW-01 postAccountingDocument is called for Payment Voucher posting.
- EW-01 reverseAccountingDocument is called for voucher cancellation.
- Allocation cancellation is append-only and represented by INSERT of a negative event.
- Allocation cancellation test asserts no mutation/delete of ar_ap_allocations.
- Direct cash/bank purchase invoice creates no AP ledger entry.
```

## Static Verification Run

The revised TypeScript service/repository/type files were type-checked in a temporary project layout matching their import paths:

```bash
tsc --noEmit --pretty false --strict false --skipLibCheck --target ES2020 --module commonjs \
  src/types/ar-ap.types.ts src/repositories/*.ts src/services/ar-ap.service.ts
```

Result:

```text
PASS — no TypeScript errors.
```

The test file was also syntax/type checked with minimal Jest ambient declarations:

```bash
tsc --noEmit --pretty false --strict false --skipLibCheck --target ES2020 --module commonjs \
  tests/jest.d.ts src/types/ar-ap.types.ts src/repositories/*.ts src/services/ar-ap.service.ts tests/ar-ap.service.test.ts
```

Result:

```text
PASS — no TypeScript errors under the local Jest declaration shim.
```

## Static Contract Checks Run

```bash
grep -RIn --include='*.ts' --include='*.sql' "UPDATE .*ar_ap_allocations\|DELETE .*ar_ap_allocations" .
grep -RIn --include='*.ts' --include='*.sql' "chart.*accounts" .
grep -RIn --include='*.ts' --include='*.sql' "INSERT INTO .*gl_.*entries\|UPDATE .*gl_.*entries\|DELETE .*gl_.*entries" .
```

Result:

```text
PASS — no code path mutates ar_ap_allocations.
PASS — no legacy chart table dependency in TS/SQL.
PASS — no direct GL write in TS/SQL.
```

## Scope Control Evidence

No P1/P2 functionality was added:

```text
- No bank reconciliation.
- No global party netting.
- No inventory/tax feature expansion.
- No reposting tool.
```
