#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
exec psql -d "$DATABASE_URL" "$@"
