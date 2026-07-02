# Validation Commands — MD01/EW01 Preseed v1.1

## Static validation

```bash
python3 -m py_compile scripts/setup_md01_local_preseed.py
bash -n scripts/setup_md01_local_preseed.sh
```

## Database validation

```bash
set -a
source ./out/md01-preseed-v1.1/.env.integration.generated
set +a

./scripts/setup_md01_local_preseed.sh \
  --verify-only \
  --env-file ./out/md01-preseed-v1.1/.env.integration.generated \
  --output-dir ./out/md01-preseed-v1.1-verify

psql -d "$DATABASE_URL" \
  -v MD01_COMPANY_ID="$MD01_COMPANY_ID" \
  -v MD01_INVENTORY_ACCOUNT_ID="$MD01_INVENTORY_ACCOUNT_ID" \
  -v MD01_COGS_ACCOUNT_ID="$MD01_COGS_ACCOUNT_ID" \
  -v MD01_REVENUE_ACCOUNT_ID="$MD01_REVENUE_ACCOUNT_ID" \
  -v MD01_EXPENSE_ACCOUNT_ID="$MD01_EXPENSE_ACCOUNT_ID" \
  -v MD01_GRNI_ACCOUNT_ID="$MD01_GRNI_ACCOUNT_ID" \
  -f verification/verify_md01_preseed.sql
```

Expected result:

```text
verification_result=PASS
```
