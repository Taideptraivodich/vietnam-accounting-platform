# Rerun Commands — Local Runbook Compatibility v1.0.3

```bash
export NODE_ENV=integration
export DATABASE_URL="postgres://vap_user:REPLACE_ME@127.0.0.1:15432/vap_integration"

source scripts/final_gate_local_env_exports.sh

# Connectivity check using Git Bash compatible psql form.
psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'select current_database(), current_user;'

# Apply ordered migrations with CRLF-safe reading.
MIGRATION_ORDER_FILE=migrations/MIGRATION_ORDER.txt \
MIGRATION_ROOT=. \
./scripts/apply_ordered_migrations_crlf_safe.sh

# Then run MD01/EW01 preseed v1.1, MD-01 seed, INT-01B adapter install/load check, and INT01A smoke.
./scripts/setup_md01_local_preseed.sh --output-dir ./out/md01-preseed-v1.1
set -a
source ./out/md01-preseed-v1.1/.env.integration.generated
set +a
npm run md01:seed
npm run int01a:smoke
```

Expected next blocker before INT-01B is applied:

```text
INT01A-04 approved-surface adapter binding missing
```

Expected after INT-01B is also applied:

```text
The local gate should move beyond INT01A-04 unless a downstream approved module surface fails.
```
