# LOCAL_RUNBOOK_COMPAT_PATCH_P0_v1_0_5

This package provides the P0 local runbook compatibility patch required after the Final Integration Gate v1.0.3 rerun exposed manual local-runbook intervention requirements.

## What is included

- `run_int01b_final_gate_local.sh` — patched one-command Windows Git Bash/local runbook.
- `final_gate_local_env_exports.sh` — helper sourced by the runbook to propagate generated MD01/DATABASE_URL/NODE_ENV/INT01A env into child npm processes.
- `WINDOWS_GIT_BASH_COMPATIBILITY_NOTES.md` — Python and Git Bash compatibility notes.
- `CLEAN_RERUN_COMMAND.md` — the clean rerun command and optional overrides.
- `EVIDENCE_CHECKLIST.md` — evidence expected from the runbook.
- `FIXED_BUGS.md` — explanation of the Python, preseed, env propagation, DATABASE_URL, and evidence zip fixes.

## Scope guardrails

This patch does not alter accounting business logic, does not fake an INT01A pass, does not bypass migrations/preseed/MD01 seed/adapter execution, and does not authorize production merge.

Expected current real blocker remains:

```text
INT01A-05 companySettingsRepository is required
```

If INT-01B v1.2 has also been applied, the gate may progress beyond that blocker and expose a later real blocker.
