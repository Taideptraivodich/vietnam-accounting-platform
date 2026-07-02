# MD01/EW01 Preseed Account Subtype Patch P0 v1.1

## Status

```text
Patch package: MD01_EW01_PRESEED_ACCOUNT_SUBTYPE_PATCH_P0_v1_1
Final Integration Gate v1.0.3: still BLOCKED until LOCAL-ASSEMBLY-01 reruns and INT-01B approved-surface adapter package is applied
Production merge: NOT ALLOWED
Architecture Freeze v1.0: STILL VALID
EW business-code revision: NOT INCLUDED
P1/P2: NOT OPENED
```

## Purpose

This package patches the deterministic local MD01/EW01 preseed setup so baseline accounts are inserted with explicit `account_subtype` values and the GRNI account ID is emitted for downstream MD-01 seed/runner use.

It fixes the observed local failure:

```text
Cannot create inventory account baseline because required columns without defaults are not safely inferable:
account_subtype character varying(64)
```

## Patch files

```text
scripts/setup_md01_local_preseed.py
scripts/setup_md01_local_preseed.sh
.env.integration.example
examples/.env.integration.generated.example
verification/verify_md01_preseed.sql
patches/setup_md01_local_preseed_v1_0_to_v1_1.diff
MD01_EW01_PRESEED_PATCH_SUMMARY.md
MD01_EW01_PRESEED_TEST_EVIDENCE.md
MD01_EW01_PRESEED_OPEN_ISSUES.md
BEFORE_AFTER.md
RERUN_COMMANDS.md
VALIDATION_COMMANDS.md
KNOWN_NON_GOALS.md
```

## Exact apply steps

From the repository root after applying ordered migrations:

```bash
cp scripts/setup_md01_local_preseed.py scripts/setup_md01_local_preseed.py.bak.v1_0 2>/dev/null || true
cp <patch>/scripts/setup_md01_local_preseed.py scripts/setup_md01_local_preseed.py
cp <patch>/scripts/setup_md01_local_preseed.sh scripts/setup_md01_local_preseed.sh
chmod +x scripts/setup_md01_local_preseed.sh scripts/setup_md01_local_preseed.py

cp <patch>/.env.integration.example .env.integration.example
mkdir -p verification
cp <patch>/verification/verify_md01_preseed.sql verification/verify_md01_preseed.sql
```

`<patch>` is the extracted `MD01_EW01_PRESEED_ACCOUNT_SUBTYPE_PATCH_P0_v1_1` directory.

## Run order

```text
1. Start disposable local PostgreSQL.
2. Apply ordered migrations.
3. Run scripts/setup_md01_local_preseed.sh from this patch.
4. Source generated .env.integration.generated.
5. Run MD-01 seed.
6. Run LOCAL-ASSEMBLY-01 rerun sequence.
```

## Required baseline subtype mapping

```text
Inventory account         account_subtype=merchandise_inventory
COGS account              account_subtype=cogs
Revenue account           account_subtype=sales_revenue
Purchase expense account  account_subtype=purchase_expense
GRNI account              account_subtype=goods_received_not_invoiced
```

The script uses existing EW-01 enum labels when the column is enum-typed, or these text values when the column is varchar/text. It fails closed if an enum cannot be safely mapped.
