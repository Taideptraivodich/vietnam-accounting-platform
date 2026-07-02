# LOCAL_RUNBOOK v1.0.6 JSON source-of-truth INT01A first-failure summary.
# Place immediately after the INT01A smoke command and before final console summary.

INT01A_REPORTS_DIR="${INT01A_REPORTS_DIR:-reports/int01a}"
INT01A_CONSOLE_LOG="${INT01A_CONSOLE_LOG:-${EVIDENCE_DIR:-reports}/int01a_console.log}"

node scripts/int01a-json-first-failure-summary.mjs \
  --reports-dir "$INT01A_REPORTS_DIR" \
  --console-log "$INT01A_CONSOLE_LOG"
