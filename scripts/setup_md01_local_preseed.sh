#!/usr/bin/env bash
set -euo pipefail

# MD01/EW01 deterministic local preseed wrapper v1.2.
# Uses PYTHON_BIN when supplied; otherwise tries python3, python, then Windows py -3.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_SCRIPT="$SCRIPT_DIR/setup_md01_local_preseed.py"

if [[ ! -f "$PY_SCRIPT" ]]; then
  echo "BLOCKED: missing Python preseed script: $PY_SCRIPT" >&2
  exit 2
fi

if [[ -n "${PYTHON_BIN:-}" ]]; then
  # shellcheck disable=SC2206
  PY_CMD=( ${PYTHON_BIN} )
  exec "${PY_CMD[@]}" "$PY_SCRIPT" "$@"
fi

if command -v python3 >/dev/null 2>&1; then
  exec python3 "$PY_SCRIPT" "$@"
elif command -v python >/dev/null 2>&1; then
  exec python "$PY_SCRIPT" "$@"
elif command -v py >/dev/null 2>&1; then
  exec py -3 "$PY_SCRIPT" "$@"
else
  echo "BLOCKED: no Python launcher found. Set PYTHON_BIN=python3, PYTHON_BIN=python, or PYTHON_BIN='py -3'." >&2
  exit 2
fi
