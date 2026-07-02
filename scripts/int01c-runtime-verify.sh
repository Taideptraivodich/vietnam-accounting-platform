#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${MD01_COMPANY_ID:?MD01_COMPANY_ID is required}"
: "${MD01_ITEM_ID:?MD01_ITEM_ID is required}"
: "${MD01_WAREHOUSE_ID:?MD01_WAREHOUSE_ID is required}"

OUT_DIR="${1:-reports/int01c}"
mkdir -p "$OUT_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$OUT_DIR/int01c_stock_precondition_evidence_$TS.txt"

{
  echo "# INT-01C runtime evidence"
  echo "timestamp_utc=$TS"
  echo "company=$MD01_COMPANY_ID"
  echo "item=$MD01_ITEM_ID"
  echo "warehouse=$MD01_WAREHOUSE_ID"
  echo
  echo "## stock_balances rows for MD01 seeded item/warehouse"
  psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v "company_id=$MD01_COMPANY_ID" \
    -v "item_id=$MD01_ITEM_ID" \
    -v "warehouse_id=$MD01_WAREHOUSE_ID" <<'SQL'
SELECT *
FROM stock_balances
WHERE company_id = :'company_id'
  AND item_id = :'item_id'
  AND warehouse_id = :'warehouse_id'
ORDER BY 1
LIMIT 20;
SQL
  echo
  echo "## inventory_ledger_entries rows for MD01 seeded item/warehouse"
  psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v "company_id=$MD01_COMPANY_ID" \
    -v "item_id=$MD01_ITEM_ID" \
    -v "warehouse_id=$MD01_WAREHOUSE_ID" <<'SQL'
SELECT *
FROM inventory_ledger_entries
WHERE company_id = :'company_id'
  AND item_id = :'item_id'
  AND warehouse_id = :'warehouse_id'
ORDER BY 1 DESC
LIMIT 20;
SQL
  echo
  echo "## protected-table writes policy"
  echo "This script performs SELECT-only evidence queries and uses psql -d \"$DATABASE_URL\" for Git Bash compatibility."
} | tee "$OUT"

echo "[INT-01C runtime] wrote $OUT"
