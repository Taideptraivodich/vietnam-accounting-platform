#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

TMP_FILE="CHECKSUMS.sha256.tmp"
OUT_FILE="CHECKSUMS.sha256"

find . \
  -path './.git' -prune -o \
  -path './node_modules' -prune -o \
  -path './raw_package_extract' -prune -o \
  -type f \
  ! -name 'CHECKSUMS.sha256' \
  ! -name 'CHECKSUMS.sha256.tmp' \
  -print0 | sort -z | xargs -0 sha256sum > "$TMP_FILE"

mv "$TMP_FILE" "$OUT_FILE"

echo "Regenerated $OUT_FILE"
