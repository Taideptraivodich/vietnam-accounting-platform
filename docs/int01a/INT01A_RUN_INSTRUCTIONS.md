# INT-01A Run Instructions

See `README_RUN_INT01A_SMOKE.md` for the complete workflow.

Minimal command:

```bash
set -a
source .env.integration.local
set +a
npm run int01a:smoke
```

The command is valid only after LOCAL-ASSEMBLY-01 has applied ordered migrations, run MD01/EW01 preseed, and run MD-01 seed against a disposable PostgreSQL database.
