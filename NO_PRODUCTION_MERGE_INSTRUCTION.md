# No Production Merge Instruction

```text
Production merge: NOT ALLOWED
Architecture Freeze v1.0: STILL VALID
Gate status remains BLOCKED until the real INT01A-05 functional Sales/Delivery approved-surface wiring is fixed and the final smoke passes.
```

This patch is limited to local runbook compatibility for Windows Git Bash + Docker Desktop. It must not be interpreted as acceptance of the INT01A-05 blocker, and it must not be used to bypass migrations, preseed, MD01 seed, adapter execution, or INT01A smoke execution.

The runner intentionally exits non-zero if `npm run int01a:smoke` reports the current real blocker.
