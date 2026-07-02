# Apply Notes

This package is delivered as replacement local preseed scripts rather than a source-control diff because the uploaded blocker dispatch package did not include the original v1.1 source files.

Apply by copying:

```text
scripts/setup_md01_local_preseed.sh -> <candidate>/scripts/setup_md01_local_preseed.sh
scripts/setup_md01_local_preseed.py -> <candidate>/scripts/setup_md01_local_preseed.py
verification/verify_md01_preseed.sql -> <candidate>/verification/verify_md01_preseed.sql
```

Then run the v1.2 command from `docs/EXACT_LOCAL_RERUN_COMMANDS.md`.
