#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must point to a local disposable PostgreSQL database}"
: "${MD01_COMPANY_ID:?Set MD01_COMPANY_ID to an existing companies.id}"
: "${MD01_INVENTORY_ACCOUNT_ID:?Set MD01_INVENTORY_ACCOUNT_ID to an existing accounts.id}"
: "${MD01_COGS_ACCOUNT_ID:?Set MD01_COGS_ACCOUNT_ID to an existing accounts.id}"
: "${MD01_REVENUE_ACCOUNT_ID:?Set MD01_REVENUE_ACCOUNT_ID to an existing accounts.id}"
: "${MD01_EXPENSE_ACCOUNT_ID:?Set MD01_EXPENSE_ACCOUNT_ID to an existing accounts.id}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$ROOT/seeds/seeders/seed_master_data_baseline.js"
