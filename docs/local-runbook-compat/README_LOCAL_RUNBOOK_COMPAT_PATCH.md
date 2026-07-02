# Local Runbook Compatibility Patch P0 v1.0.3

## Status

```text
Patch package: LOCAL_RUNBOOK_COMPAT_PATCH_P0_v1_0_3
Final Integration Gate v1.0.3: still BLOCKED until LOCAL-ASSEMBLY-01 reruns and INT-01B approved-surface adapter package is applied
Production merge: NOT ALLOWED
Architecture Freeze v1.0: STILL VALID
EW business-code revision: NOT INCLUDED
P1/P2: NOT OPENED
```

## Purpose

This package removes local-run workarounds found during the Final Gate v1.0.3 rerun:

```text
Windows/Git Bash psql invocation: use psql -d "$DATABASE_URL"
CRLF migration order file: strip trailing \r before file existence checks
AR/AP ledger aliases: default both AR and AP ledger tables to ar_ap_ledger_entries
```

## Patch files

```text
scripts/apply_ordered_migrations_crlf_safe.sh
scripts/psql_local.sh
scripts/final_gate_local_env_exports.sh
env/int01a_ar_ap_aliases.env
.env.integration.example.append
patches/local_runbook_compat_v1_0_3.patch
README.md
BEFORE_AFTER.md
RERUN_COMMANDS.md
VALIDATION_COMMANDS.md
KNOWN_NON_GOALS.md
LOCAL_RUNBOOK_COMPAT_TEST_EVIDENCE.md
```

## Exact apply steps

From the repository root:

```bash
mkdir -p scripts env patches
cp <patch>/scripts/apply_ordered_migrations_crlf_safe.sh scripts/apply_ordered_migrations_crlf_safe.sh
cp <patch>/scripts/psql_local.sh scripts/psql_local.sh
cp <patch>/scripts/final_gate_local_env_exports.sh scripts/final_gate_local_env_exports.sh
cp <patch>/env/int01a_ar_ap_aliases.env env/int01a_ar_ap_aliases.env
chmod +x scripts/apply_ordered_migrations_crlf_safe.sh scripts/psql_local.sh scripts/final_gate_local_env_exports.sh
cat <patch>/.env.integration.example.append >> .env.integration.example
```

Optionally apply the patch snippets in `patches/local_runbook_compat_v1_0_3.patch` to the repository's existing local runbook script(s). The standalone scripts are included so LOCAL-ASSEMBLY-01 can run without guessing where old runbook fragments live.
