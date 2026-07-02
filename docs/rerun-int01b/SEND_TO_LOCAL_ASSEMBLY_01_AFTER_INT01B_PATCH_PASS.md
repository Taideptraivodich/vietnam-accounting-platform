# Message to LOCAL-ASSEMBLY-01

Senior accepted the three P0 remediation packages for local rerun:

```text
INT-01B_APPROVED_SURFACE_ADAPTER_BINDINGS_P0_v1_0.zip
MD01_EW01_PRESEED_ACCOUNT_SUBTYPE_PATCH_P0_v1_1.zip
LOCAL_RUNBOOK_COMPAT_PATCH_P0_v1_0_3.zip
```

Please rerun Final Integration Gate v1.0.3 on the local Docker PostgreSQL candidate.

Required settings:

```bash
export NODE_ENV=integration
export INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
export INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
export INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs
```

Use MD01/EW01 preseed v1.1 to generate real DB IDs, then run MD-01 seed and `npm run int01a:smoke`.

Return:

```text
LOCAL_ASSEMBLY_FINAL_GATE_v1_0_3_RERUN_REPORTS.zip
```

No fake pass, no SQL simulation of module behavior, no MD-01 seed bypass, no production merge.
