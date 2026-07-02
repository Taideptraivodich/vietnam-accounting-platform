#!/usr/bin/env bash
# LOCAL_RUNBOOK_COMPAT_PATCH_P0_v1_0_5
# Local Final Integration Gate runbook compatibility patch.
# Scope: Docker/PostgreSQL startup, migrations, MD01/EW01 preseed v1.2,
# MD01 seed, INT01A smoke env propagation, and evidence preservation only.
# This script does not change accounting business logic and does not fake a pass.

set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

if [[ -f "$SCRIPT_DIR/final_gate_local_env_exports.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/final_gate_local_env_exports.sh"
else
  echo "ERROR: final_gate_local_env_exports.sh must exist next to this script." >&2
  exit 1
fi

RUN_ID=${RUN_ID:-$(date +%Y%m%d_%H%M%S)}
EVIDENCE_ROOT=${EVIDENCE_ROOT:-evidence/local_final_gate_v1_0_5}
EVIDENCE_DIR=${EVIDENCE_DIR:-$EVIDENCE_ROOT/$RUN_ID}
mkdir -p "$EVIDENCE_DIR"
EVIDENCE_DIR=$(cd "$EVIDENCE_DIR" && pwd)
CONSOLE_LOG="$EVIDENCE_DIR/console.log"

# Preserve full console evidence from this point onward.
exec > >(tee -a "$CONSOLE_LOG") 2>&1

POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-local-final-gate-postgres-v105}
POSTGRES_IMAGE=${POSTGRES_IMAGE:-postgres:16}
POSTGRES_HOST=${POSTGRES_HOST:-127.0.0.1}
POSTGRES_PORT=${POSTGRES_PORT:-15432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
POSTGRES_DB=${POSTGRES_DB:-local_final_gate}
DERIVED_DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" != "$DERIVED_DATABASE_URL" ]]; then
  echo "WARNING: ignoring pre-existing DATABASE_URL so the runbook uses the actual Docker PostgreSQL credentials/database." >&2
fi
DATABASE_URL="$DERIVED_DATABASE_URL"
export DATABASE_URL

MIGRATION_LOG="$EVIDENCE_DIR/migrations.log"
PRESEED_LOG="$EVIDENCE_DIR/preseed-output.log"
MD01_SEED_LOG="$EVIDENCE_DIR/md01-seed.log"
NPM_VERIFY_LOG="$EVIDENCE_DIR/npm-dependency-verification.log"
INT01A_LOG="$EVIDENCE_DIR/int01a-smoke-console.log"
SUMMARY_FILE="$EVIDENCE_DIR/local_gate_summary.md"
FIRST_FAIL_FILE="$EVIDENCE_DIR/first_failing_int01a_step.txt"
ENV_SNAPSHOT_FILE="$EVIDENCE_DIR/final_gate_local_env_snapshot.sh"
PRESEED_OUTPUT_DIR="$EVIDENCE_DIR/md01-preseed-v1.2"
mkdir -p "$PRESEED_OUTPUT_DIR"

STATUS="RUNNING"
FIRST_FAILING_STEP="not-yet-determined"
FIRST_FAILING_ERROR="not-yet-determined"
ZIP_CREATED="not-created"

log_section() {
  printf '\n========== %s ==========' "$1"
  printf '\n'
}

fail() {
  local message=$1
  STATUS="FAILED"
  if [[ "$FIRST_FAILING_STEP" == "not-yet-determined" ]]; then
    FIRST_FAILING_STEP="$message"
    FIRST_FAILING_ERROR="$message"
  fi
  echo "ERROR: $message" >&2
  return 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

split_command_string() {
  # Split PYTHON_BIN-style values such as "py -3" into an argv array.
  # This intentionally handles the observed Git Bash case where PYTHON_BIN contains a space.
  # If the Python executable path itself contains spaces, prefer a wrapper script, e.g. local-bin/python.
  local raw=${1:?command string required}
  local -n out_array=$2
  local old_ifs=$IFS
  IFS=' ' read -r -a out_array <<< "$raw"
  IFS=$old_ifs
}

python_is_v3() {
  local -a candidate=("$@")
  "${candidate[@]}" - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info.major >= 3 else 1)
PY
}

select_python3() {
  PYTHON_CMD=()

  if [[ -n "${PYTHON_BIN:-}" ]]; then
    split_command_string "$PYTHON_BIN" PYTHON_CMD
    if (( ${#PYTHON_CMD[@]} == 0 )); then
      echo "ERROR: PYTHON_BIN was set but empty after parsing." >&2
      return 1
    fi
    if ! command_exists "${PYTHON_CMD[0]}"; then
      echo "ERROR: PYTHON_BIN command not found: ${PYTHON_CMD[*]}" >&2
      return 1
    fi
    if python_is_v3 "${PYTHON_CMD[@]}"; then
      echo "Using Python from PYTHON_BIN: ${PYTHON_CMD[*]}"
      return 0
    fi
    echo "ERROR: PYTHON_BIN does not resolve to Python 3: ${PYTHON_CMD[*]}" >&2
    return 1
  fi

  local candidate
  local -a candidate_cmd
  for candidate in python python3 "py -3"; do
    split_command_string "$candidate" candidate_cmd
    if command_exists "${candidate_cmd[0]}" && python_is_v3 "${candidate_cmd[@]}"; then
      PYTHON_CMD=("${candidate_cmd[@]}")
      echo "Using detected Python 3: ${PYTHON_CMD[*]}"
      return 0
    fi
  done

  echo "ERROR: no Python 3 interpreter found. Tried: python, python3, py -3." >&2
  echo "       On Windows Git Bash, either install Python 3 on PATH or set PYTHON_BIN='py -3'." >&2
  return 1
}

resolve_preseed_script() {
  PRESEED_SCRIPT_RESOLVED=""

  if [[ -n "${PRESEED_SCRIPT:-}" ]]; then
    case "$PRESEED_SCRIPT" in
      *"Could not auto-detect"*|*"ERROR:"*)
        echo "ERROR: PRESEED_SCRIPT appears to contain an error message, not a file path: $PRESEED_SCRIPT" >&2
        return 1
        ;;
    esac
    if [[ ! -f "$PRESEED_SCRIPT" ]]; then
      echo "ERROR: PRESEED_SCRIPT override does not exist: $PRESEED_SCRIPT" >&2
      return 1
    fi
    PRESEED_SCRIPT_RESOLVED="$PRESEED_SCRIPT"
    echo "Using PRESEED_SCRIPT override: $PRESEED_SCRIPT_RESOLVED"
    return 0
  fi

  local candidates=(
    scripts/setup_md01_local_preseed.py
  )
  local path
  for path in "${candidates[@]}"; do
    if [[ -f "$path" ]]; then
      PRESEED_SCRIPT_RESOLVED="$path"
      echo "Auto-detected preseed script: $PRESEED_SCRIPT_RESOLVED"
      return 0
    fi
  done

  echo "ERROR: could not auto-detect the accepted MD01/EW01 preseed script." >&2
  echo "       Expected: scripts/setup_md01_local_preseed.py" >&2
  echo "       Or set PRESEED_SCRIPT to a valid Python script path." >&2
  return 1
}

wait_for_postgres() {
  local max_attempts=${POSTGRES_READY_ATTEMPTS:-60}
  local attempt
  for (( attempt=1; attempt<=max_attempts; attempt++ )); do
    if psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc 'select 1' >/dev/null 2>&1; then
      echo "PostgreSQL is ready via DATABASE_URL: $DATABASE_URL"
      return 0
    fi
    sleep 1
  done
  echo "ERROR: PostgreSQL did not become ready after ${max_attempts}s." >&2
  return 1
}

start_postgres_container() {
  log_section "Docker PostgreSQL startup"
  command_exists docker || fail "docker is required for local gate PostgreSQL startup"
  command_exists psql || fail "psql is required for readiness checks and migrations"

  if docker ps -a --format '{{.Names}}' | grep -Fxq "$POSTGRES_CONTAINER"; then
    echo "Removing existing local gate container: $POSTGRES_CONTAINER"
    docker rm -f "$POSTGRES_CONTAINER" >/dev/null
  fi

  echo "Starting PostgreSQL container $POSTGRES_CONTAINER on ${POSTGRES_HOST}:${POSTGRES_PORT}"
  docker run --name "$POSTGRES_CONTAINER" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "${POSTGRES_PORT}:5432" \
    -d "$POSTGRES_IMAGE" >/dev/null

  wait_for_postgres
}

find_migration_files() {
  MIGRATION_FILES=()
  local search_dirs=(migrations db/migrations database/migrations sql/migrations scripts/migrations)
  local dir
  for dir in "${search_dirs[@]}"; do
    [[ -d "$dir" ]] || continue
    while IFS= read -r file; do
      MIGRATION_FILES+=("$file")
    done < <(find "$dir" -maxdepth 2 -type f \( \
      -name '001*.sql' -o -name '002*.sql' -o -name '003*.sql' -o -name '004*.sql' -o \
      -name '005*.sql' -o -name '006*.sql' -o -name '007*.sql' \
      \) | LC_ALL=C sort)
    if (( ${#MIGRATION_FILES[@]} > 0 )); then
      break
    fi
  done

  if (( ${#MIGRATION_FILES[@]} == 0 )); then
    echo "ERROR: no ordered SQL migrations 001-007 found in expected migration directories." >&2
    return 1
  fi

  local required_prefix prefix found
  for required_prefix in 001 002 003 004 005 006 007; do
    found=0
    for file in "${MIGRATION_FILES[@]}"; do
      prefix=$(basename "$file" | sed -E 's/^([0-9]{3}).*/\1/')
      if [[ "$prefix" == "$required_prefix" ]]; then
        found=1
        break
      fi
    done
    if (( found == 0 )); then
      echo "ERROR: missing required migration prefix $required_prefix among detected migration files." >&2
      printf 'Detected files:\n' >&2
      printf '  %s\n' "${MIGRATION_FILES[@]}" >&2
      return 1
    fi
  done
}

apply_migrations() {
  log_section "SQL migrations 001-007"
  find_migration_files
  : > "$MIGRATION_LOG"
  printf 'DATABASE_URL=%s\n' "$DATABASE_URL" >> "$MIGRATION_LOG"

  local file
  for file in "${MIGRATION_FILES[@]}"; do
    echo "Applying migration: $file" | tee -a "$MIGRATION_LOG"
    psql -d "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" >> "$MIGRATION_LOG" 2>&1
  done
}

verify_npm_dependencies() {
  log_section "npm dependency verification"
  command_exists npm || fail "npm is required for MD01 seed and INT01A smoke"
  command_exists node || fail "node is required for dependency verification"
  : > "$NPM_VERIFY_LOG"

  if [[ -f package-lock.json ]]; then
    echo "Running npm ci" | tee -a "$NPM_VERIFY_LOG"
    npm ci >> "$NPM_VERIFY_LOG" 2>&1
  else
    echo "package-lock.json not found; skipping npm ci and preserving existing node_modules" | tee -a "$NPM_VERIFY_LOG"
  fi

  echo "Verifying pg dependency" | tee -a "$NPM_VERIFY_LOG"
  node - <<'NODE' >> "$NPM_VERIFY_LOG" 2>&1
try {
  require('pg');
  console.log('pg dependency OK');
} catch (error) {
  console.error('pg dependency verification failed:', error && error.message ? error.message : error);
  process.exit(1);
}
NODE
}

run_preseed() {
  log_section "MD01/EW01 preseed v1.2"
  select_python3
  resolve_preseed_script
  : > "$PRESEED_LOG"

  export DATABASE_URL
  echo "Running preseed: ${PYTHON_CMD[*]} $PRESEED_SCRIPT_RESOLVED --output-dir $PRESEED_OUTPUT_DIR --print-generated-sql" | tee -a "$PRESEED_LOG"
  "${PYTHON_CMD[@]}" "$PRESEED_SCRIPT_RESOLVED" \
    --output-dir "$PRESEED_OUTPUT_DIR" \
    --print-generated-sql >> "$PRESEED_LOG" 2>&1

  GENERATED_ENV_FILE=""
  local env_candidate
  for env_candidate in \
    "$PRESEED_OUTPUT_DIR/.env.integration.generated" \
    "$PRESEED_OUTPUT_DIR/env.integration.generated" \
    "$PRESEED_OUTPUT_DIR/generated.env" \
    ".env.integration.generated"; do
    if [[ -f "$env_candidate" ]]; then
      GENERATED_ENV_FILE="$env_candidate"
      break
    fi
  done

  if [[ -z "$GENERATED_ENV_FILE" ]]; then
    GENERATED_ENV_FILE=$(find "$PRESEED_OUTPUT_DIR" . -maxdepth 2 -type f -name '.env.integration.generated' -print -quit 2>/dev/null || true)
  fi

  if [[ -z "$GENERATED_ENV_FILE" || ! -f "$GENERATED_ENV_FILE" ]]; then
    echo "ERROR: preseed completed but generated env file was not found." >&2
    echo "       Expected .env.integration.generated in $PRESEED_OUTPUT_DIR or repository root." >&2
    return 1
  fi

  cp "$GENERATED_ENV_FILE" "$EVIDENCE_DIR/.env.integration.generated"
  echo "Generated env file captured: $GENERATED_ENV_FILE -> $EVIDENCE_DIR/.env.integration.generated"

  # Capture readiness reports if the preseed produced any.
  while IFS= read -r readiness_file; do
    [[ -n "$readiness_file" ]] || continue
    cp "$readiness_file" "$EVIDENCE_DIR/$(basename "$readiness_file")"
  done < <(find "$PRESEED_OUTPUT_DIR" -maxdepth 2 -type f \( \
    -iname '*readiness*' -o -iname '*ready*report*' -o -iname '*preseed*report*' \
    \) -print 2>/dev/null || true)
}

load_gate_environment() {
  log_section "Environment propagation"
  local generated_env="$EVIDENCE_DIR/.env.integration.generated"
  local_gate_source_generated_env "$generated_env"
  local_gate_export_required_env "$DATABASE_URL"
  local_gate_write_env_snapshot "$ENV_SNAPSHOT_FILE"

  echo "Propagated environment for child npm commands:"
  grep -E '^(export )?(DATABASE_URL|NODE_ENV|MD01_|INT01A_)' "$ENV_SNAPSHOT_FILE" | sed -E 's/(postgres:\/\/[^:]+:)[^@]+@/\1****@/'
}

run_md01_seed() {
  log_section "MD01 seed"
  : > "$MD01_SEED_LOG"
  local_gate_export_required_env "$DATABASE_URL"
  npm run seed:md01 >> "$MD01_SEED_LOG" 2>&1
}

copy_int01a_reports() {
  mkdir -p "$EVIDENCE_DIR/int01a-reports"
  local found=0
  local file
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    # Avoid copying files from the evidence directory back into itself.
    case "$(cd "$(dirname "$file")" && pwd)/$(basename "$file")" in
      "$EVIDENCE_DIR"/*) continue ;;
    esac
    cp "$file" "$EVIDENCE_DIR/int01a-reports/$(basename "$file")"
    found=1
  done < <(find . \
      -path './.git' -prune -o \
      -path './node_modules' -prune -o \
      -path "./${EVIDENCE_ROOT}/*" -prune -o \
      -type f \( \
        -iname '*int01a*.json' -o -iname '*int01a*.md' -o \
        -iname '*INT01A*.json' -o -iname '*INT01A*.md' \
      \) -print 2>/dev/null || true)

  if (( found == 0 )); then
    echo "No separate INT01A JSON/Markdown reports were found outside evidence; console log is preserved at $INT01A_LOG."
  else
    echo "Copied INT01A JSON/Markdown reports into $EVIDENCE_DIR/int01a-reports"
  fi
}

extract_first_int01a_failure() {
  local source_file=$1
  local step=""
  local error=""

  if [[ -f "$source_file" ]]; then
    step=$(grep -Eo 'INT01A-[0-9]{2}[A-Z]?' "$source_file" | head -n 1 || true)
    if grep -Fq 'companySettingsRepository is required' "$source_file"; then
      step='INT01A-05'
      error='companySettingsRepository is required'
    else
      step=$(grep -Ei 'error|fail|missing|required|blocked' "$source_file" | grep -Eo 'INT01A-[0-9]{2}[A-Z]?' | head -n 1 || true)
      if [[ -z "$step" ]]; then
        step=$(grep -Eo 'INT01A-[0-9]{2}[A-Z]?' "$source_file" | tail -n 1 || true)
      fi
      error=$(grep -Ei 'error|fail|missing|required|blocked' "$source_file" | head -n 1 | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' || true)
    fi
  fi

  FIRST_FAILING_STEP=${step:-unknown-int01a-step}
  FIRST_FAILING_ERROR=${error:-see INT01A smoke console/report evidence}
  printf '%s\n%s\n' "$FIRST_FAILING_STEP" "$FIRST_FAILING_ERROR" > "$FIRST_FAIL_FILE"
}

run_int01a_smoke() {
  log_section "INT01A smoke"
  : > "$INT01A_LOG"
  local_gate_export_required_env "$DATABASE_URL"

  # Provide likely report path env names. Unsupported names are harmless; supported
  # runner versions will write reports directly into the evidence directory.
  export INT01A_REPORT_JSON="$EVIDENCE_DIR/int01a-smoke-report.json"
  export INT01A_REPORT_MARKDOWN="$EVIDENCE_DIR/int01a-smoke-report.md"
  export INT01A_JSON_REPORT="$EVIDENCE_DIR/int01a-smoke-report.json"
  export INT01A_MARKDOWN_REPORT="$EVIDENCE_DIR/int01a-smoke-report.md"
  export INT01A_EVIDENCE_DIR="$EVIDENCE_DIR"

  local smoke_status=0
  npm run int01a:smoke >> "$INT01A_LOG" 2>&1 || smoke_status=$?
  copy_int01a_reports

  if (( smoke_status != 0 )); then
    extract_first_int01a_failure "$INT01A_LOG"
    STATUS="FAILED"
    echo "INT01A smoke failed with status $smoke_status. First failing step: $FIRST_FAILING_STEP. Error: $FIRST_FAILING_ERROR"
    return "$smoke_status"
  fi

  STATUS="PASSED"
  FIRST_FAILING_STEP="none"
  FIRST_FAILING_ERROR="none"
  printf 'none\nnone\n' > "$FIRST_FAIL_FILE"
}

write_summary() {
  local exit_status=${1:-0}
  {
    echo "# Local Final Integration Gate Summary — LOCAL_RUNBOOK v1.0.5"
    echo
    echo "- Run ID: $RUN_ID"
    echo "- Status: $STATUS"
    echo "- Exit status: $exit_status"
    echo "- Evidence directory: $EVIDENCE_DIR"
    echo "- Evidence zip: $ZIP_CREATED"
    echo "- PostgreSQL container: $POSTGRES_CONTAINER"
    echo "- DATABASE_URL: ${DATABASE_URL/postgres:\/\/${POSTGRES_USER}:${POSTGRES_PASSWORD}@/postgres:\/\/${POSTGRES_USER}:****@}"
    echo "- NODE_ENV: ${NODE_ENV:-unset}"
    echo "- First failing INT01A step: $FIRST_FAILING_STEP"
    echo "- First failing INT01A error: $FIRST_FAILING_ERROR"
    echo
    echo "## Evidence files"
    echo
    echo "- console log: console.log"
    echo "- migration log: migrations.log"
    echo "- preseed output: preseed-output.log"
    echo "- generated env file: .env.integration.generated"
    echo "- env snapshot: final_gate_local_env_snapshot.sh"
    echo "- MD01 seed log: md01-seed.log"
    echo "- INT01A smoke console: int01a-smoke-console.log"
    echo "- INT01A reports: int01a-reports/ and/or int01a-smoke-report.*"
    echo "- first failing step: first_failing_int01a_step.txt"
    echo
    echo "Production merge: NOT ALLOWED by this local runbook."
  } > "$SUMMARY_FILE"
}

create_evidence_zip() {
  if ! command_exists zip; then
    echo "zip command not found; skipping evidence zip creation. Evidence directory is preserved: $EVIDENCE_DIR"
    ZIP_CREATED="not-created-zip-command-missing"
    return 0
  fi

  local evidence_parent evidence_base
  evidence_parent=$(dirname "$EVIDENCE_DIR")
  evidence_base=$(basename "$EVIDENCE_DIR")
  ZIP_CREATED="${EVIDENCE_DIR}.zip"

  # zip is created as a sibling of the evidence directory, never inside it, to avoid recursive/nested evidence capture.
  (cd "$evidence_parent" && zip -qr "$ZIP_CREATED" "$evidence_base")
  echo "Evidence zip created: $ZIP_CREATED"
}

on_exit() {
  local exit_status=$?
  if (( exit_status != 0 )) && [[ "$STATUS" == "RUNNING" ]]; then
    STATUS="FAILED"
  fi
  if command_exists zip; then
    ZIP_CREATED="${EVIDENCE_DIR}.zip"
  else
    ZIP_CREATED="not-created-zip-command-missing"
  fi
  write_summary "$exit_status" || true
  create_evidence_zip || true
  echo
  echo "Local gate status: $STATUS"
  echo "Evidence directory: $EVIDENCE_DIR"
  echo "Evidence zip: $ZIP_CREATED"
  echo "First failing INT01A step: $FIRST_FAILING_STEP"
  echo "First failing INT01A error: $FIRST_FAILING_ERROR"
  exit "$exit_status"
}
trap on_exit EXIT

main() {
  log_section "Local Final Integration Gate v1.0.3 / LOCAL_RUNBOOK v1.0.5"
  echo "Production merge remains NOT ALLOWED."
  echo "Using DATABASE_URL consistently for psql, migrations, preseed, seed, and smoke: $DATABASE_URL"

  start_postgres_container
  apply_migrations
  verify_npm_dependencies
  run_preseed
  load_gate_environment
  run_md01_seed
  run_int01a_smoke
}

main "$@"
