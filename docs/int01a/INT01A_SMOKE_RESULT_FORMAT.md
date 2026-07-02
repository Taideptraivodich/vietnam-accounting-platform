# INT-01A Smoke Result Format

This file mirrors `SMOKE_TEST_RESULT_FORMAT.md` for compatibility with the original dispatch naming.

The runner writes:

```text
reports/int01a/int01a-smoke-result-<run-id>.json
reports/int01a/INT01A_SMOKE_TEST_RESULT_<run-id>.md
```

Status values: `PASS`, `WARN`, `FAIL`.

Exit code `0` means all required invariants passed. Exit code `1` means Final Integration Gate remains blocked.
