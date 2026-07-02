#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must point to a local disposable PostgreSQL database}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
while IFS= read -r entry; do
  [[ -z "$entry" || "$entry" == \#* ]] && continue
  [[ "$entry" == 008_* ]] && continue
  file="$ROOT/migrations/$entry"
  if [[ ! -f "$file" ]]; then
    echo "Missing migration: $file" >&2
    exit 1
  fi
  echo "Applying $entry"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done < "$ROOT/migrations/MIGRATION_ORDER.txt"
