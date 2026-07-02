#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
MIGRATION_ORDER_FILE="${MIGRATION_ORDER_FILE:-migrations/MIGRATION_ORDER.txt}"
MIGRATION_ROOT="${MIGRATION_ROOT:-.}"

if [[ ! -f "$MIGRATION_ORDER_FILE" ]]; then
  echo "BLOCKED: migration order file not found: $MIGRATION_ORDER_FILE" >&2
  exit 2
fi

applied_count=0
while IFS= read -r migration || [[ -n "$migration" ]]; do
  # CRLF-safe: remove a trailing carriage return from Windows-edited MIGRATION_ORDER.txt.
  migration="${migration%$'\r'}"

  # Trim leading/trailing horizontal whitespace without touching valid path characters.
  migration="$(printf '%s' "$migration" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  [[ -z "$migration" ]] && continue
  [[ "${migration:0:1}" == "#" ]] && continue

  if [[ "$migration" = /* ]]; then
    migration_path="$migration"
  else
    migration_path="$MIGRATION_ROOT/$migration"
  fi

  if [[ ! -f "$migration_path" ]]; then
    echo "BLOCKED: migration listed in $MIGRATION_ORDER_FILE not found after CRLF normalization: $migration" >&2
    exit 3
  fi

  echo "Applying migration: $migration_path"
  psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration_path"
  applied_count=$((applied_count + 1))
done < "$MIGRATION_ORDER_FILE"

if [[ "$applied_count" -eq 0 ]]; then
  echo "BLOCKED: no migrations were applied from $MIGRATION_ORDER_FILE" >&2
  exit 4
fi

echo "migration_result=PASS applied_count=$applied_count"
