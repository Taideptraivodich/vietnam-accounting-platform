#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cat "$ROOT/integration/INT-01/INTEGRATION_HARNESS.md"
echo
echo "INT-01_EXECUTABLE_RUNNER_MISSING: this package contains procedure/report artifacts only."
