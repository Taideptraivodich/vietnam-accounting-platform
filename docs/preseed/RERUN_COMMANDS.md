# Rerun Commands — MD01/EW01 Preseed v1.1

```bash
export NODE_ENV=integration
export DATABASE_URL="postgres://vap_user:REPLACE_ME@127.0.0.1:15432/vap_integration"

# Apply ordered migrations before this step.
./scripts/setup_md01_local_preseed.sh --output-dir ./out/md01-preseed-v1.1 --print-generated-sql

set -a
source ./out/md01-preseed-v1.1/.env.integration.generated
set +a

env | grep '^MD01_.*_ID=' | sort

# Run MD-01 seed only after the generated real local DB IDs are loaded.
# Example only; use the repository's actual MD-01 seed command.
npm run md01:seed
```

This script must run after ordered migrations and before MD-01 seed.
