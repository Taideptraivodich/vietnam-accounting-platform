#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

mkdir -p reports/history

# Keep canonical PASS evidence at root and reports/int01a when present.
# Move obvious old/failing local gate reports into reports/history to reduce confusion.
if [ -d reports ]; then
  find reports -maxdepth 2 -type f \( \
    -iname '*fail*' -o \
    -iname '*blocked*' -o \
    -iname '*old*' -o \
    -iname 'latest-int01a.json' \
  \) -print0 | while IFS= read -r -d '' file; do
    case "$file" in
      reports/history/*) continue ;;
      *) mv "$file" "reports/history/$(basename "$file")" ;;
    esac
  done
fi

echo "Report history organization completed. Review git diff before commit."
