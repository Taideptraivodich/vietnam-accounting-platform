# Exact local run commands

Apply this zip at the root of the assembled local candidate tree, preserving paths.

```bash
unzip -o INT-01B_FUNCTIONAL_SALES_DELIVERY_WIRING_P0_v1_1.zip -d /path/to/local_candidate_int01b
cd /path/to/local_candidate_int01b
```

Use a disposable PostgreSQL database only:

```bash
export DATABASE_URL='postgres://vap_user:vap_password_local_only@127.0.0.1:15432/vap_integration'
export INT01A_ADAPTER_MODULE=./src/int01a/int01a-approved-surface-adapter.mjs
export INT01A_TABLE_AR_LEDGER=ar_ap_ledger_entries
export INT01A_TABLE_AP_LEDGER=ar_ap_ledger_entries
```

Run the required sequence:

```bash
npm install
npm run seed:md01
node --check src/int01a/int01a-approved-surface-adapter.mjs
node --check src/int01a/int01b-post-sales-delivery-wiring.mjs
node scripts/int01b-verify-adapter-load.mjs
npm run int01a:smoke
```

Optional local-gate wrapper, when present in the assembled candidate:

```bash
./run_int01b_final_gate_local.sh
```
