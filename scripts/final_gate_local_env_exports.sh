#!/usr/bin/env bash
# Source this file before running local Final Gate smoke commands.
# It provides safe defaults only when the caller has not already exported explicit values.

export NODE_ENV="${NODE_ENV:-integration}"
export INT01A_TABLE_AR_LEDGER="${INT01A_TABLE_AR_LEDGER:-ar_ap_ledger_entries}"
export INT01A_TABLE_AP_LEDGER="${INT01A_TABLE_AP_LEDGER:-ar_ap_ledger_entries}"
export INT01A_ADAPTER_MODULE="${INT01A_ADAPTER_MODULE:-./src/int01a/int01a-approved-surface-adapter.mjs}"
