# Patch Manifest — LOCAL_RUNBOOK_COMPAT_PATCH_P0_v1_0_4

## Included files

```text
run_int01b_final_gate_local.sh
WINDOWS_GIT_BASH_COMPATIBILITY_NOTES.md
CLEAN_RERUN_COMMAND.md
EXPECTED_OUTPUT_CHECKLIST.md
NO_PRODUCTION_MERGE_INSTRUCTION.md
PATCH_MANIFEST.md
```

## Scope

Local runbook compatibility only.

## Constraints honored

```text
No accounting business semantics changed.
No smoke-test success is faked.
No migrations are bypassed.
No preseed is bypassed.
No MD01 seed is bypassed.
No adapter execution is bypassed.
Failure outputs remain visible and are preserved as evidence.
Production merge remains forbidden.
```

## Source context

Built from the Senior dispatch package for `P0 Revision Request — Local Runbook Compatibility Patch v1.0.4`, which identified these compatibility blockers:

```text
PostgreSQL container startup race
MIGRATION_ROOT=. instead of migrations
MIGRATION_ORDER including a non-SQL seed step
Windows Git Bash Python launcher compatibility
psql "$DATABASE_URL" incompatibility; use psql -d "$DATABASE_URL"
Node pg dependency missing before seed/smoke
```
