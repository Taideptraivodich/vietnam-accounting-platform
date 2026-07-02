# Exact Local Rerun Commands — MD01/EW01 Preseed v1.2

Run from the assembled local candidate root after applying migrations `001`–`007`.

## 1. Install/copy patch files

```bash
mkdir -p scripts verification
cp MD01_EW01_PRESEED_FIX_P0_v1_2/scripts/setup_md01_local_preseed.sh scripts/setup_md01_local_preseed.sh
cp MD01_EW01_PRESEED_FIX_P0_v1_2/scripts/setup_md01_local_preseed.py scripts/setup_md01_local_preseed.py
cp MD01_EW01_PRESEED_FIX_P0_v1_2/verification/verify_md01_preseed.sql verification/verify_md01_preseed.sql
chmod +x scripts/setup_md01_local_preseed.sh scripts/setup_md01_local_preseed.py
```

## 2. Run preseed v1.2

```bash
export DATABASE_URL="postgres://vap_user:vap_password_local_only@127.0.0.1:15432/vap_integration"

./scripts/setup_md01_local_preseed.sh \
  --output-dir ./out/md01-preseed-v1.2 \
  --print-generated-sql \
  2>&1 | tee ./out/md01-preseed-v1.2.console.log
```

## 3. Export generated IDs

```bash
set -a
source ./out/md01-preseed-v1.2/.env.integration.generated
set +a

env | grep '^MD01_.*_ID=' | sort
```

Expected keys:

```text
MD01_COMPANY_ID
MD01_INVENTORY_ACCOUNT_ID
MD01_COGS_ACCOUNT_ID
MD01_REVENUE_ACCOUNT_ID
MD01_EXPENSE_ACCOUNT_ID
MD01_GRNI_ACCOUNT_ID
```

## 4. Verify rows in PostgreSQL

```bash
psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v MD01_COMPANY_ID="$MD01_COMPANY_ID" \
  -v MD01_INVENTORY_ACCOUNT_ID="$MD01_INVENTORY_ACCOUNT_ID" \
  -v MD01_COGS_ACCOUNT_ID="$MD01_COGS_ACCOUNT_ID" \
  -v MD01_REVENUE_ACCOUNT_ID="$MD01_REVENUE_ACCOUNT_ID" \
  -v MD01_EXPENSE_ACCOUNT_ID="$MD01_EXPENSE_ACCOUNT_ID" \
  -v MD01_GRNI_ACCOUNT_ID="$MD01_GRNI_ACCOUNT_ID" \
  -f verification/verify_md01_preseed.sql
```

Expected final line:

```text
MD01_PRESEED_VERIFY=PASS
```

## 5. Run MD-01 seed

```bash
set -a
source ./out/md01-preseed-v1.2/.env.integration.generated
set +a

npm run seed:md01
```

If this repository still exposes the older script name, use the package alias already present in the local runbook, for example:

```bash
npm run md01:seed
```

## 6. Continue INT01A smoke

```bash
export INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
export INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
export INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs

npm run int01a:smoke
```
